import json
import time
import threading
from typing import AsyncGenerator

import httpx
import logging

from app.core.config import settings


logger = logging.getLogger(__name__)


class LLMUnavailableError(Exception):
    """Raised when Ollama cannot be reached, times out, or drops the connection."""


class _CircuitBreaker:
    """Simple three-state circuit breaker for the Ollama HTTP client.

    States:
      closed   — normal operation; requests go through.
      open     — Ollama has failed repeatedly; requests fail fast.
      half-open — cooldown has elapsed; the next request is a probe.

    All state is module-level so it survives across OllamaClient instances
    (a new OllamaClient is created per API request via _make_llm_client).
    Thread-safe via a lock; async callers are unaffected since state reads
    and writes are short non-blocking operations.
    """

    def __init__(self, failure_threshold: int = 3, cooldown_seconds: float = 30.0) -> None:
        self._threshold = failure_threshold
        self._cooldown = cooldown_seconds
        self._failures = 0
        self._opened_at: float | None = None
        self._lock = threading.Lock()

    def _state(self) -> str:
        if self._opened_at is None:
            return "closed"
        if time.monotonic() - self._opened_at >= self._cooldown:
            return "half-open"
        return "open"

    def is_open(self) -> bool:
        with self._lock:
            state = self._state()
            if state == "open":
                return True
            if state == "half-open":
                # Allow exactly one probe through; reset the open timestamp so
                # subsequent concurrent requests also see half-open until the
                # probe resolves.
                self._opened_at = None
                return False
            return False

    def record_failure(self) -> None:
        with self._lock:
            self._failures += 1
            if self._failures >= self._threshold:
                self._opened_at = time.monotonic()
                logger.warning(
                    "Ollama circuit breaker opened after %d consecutive failures.",
                    self._failures,
                )

    def record_success(self) -> None:
        with self._lock:
            if self._failures > 0 or self._opened_at is not None:
                logger.info("Ollama circuit breaker reset after successful request.")
            self._failures = 0
            self._opened_at = None


# Module-level singleton — shared across all OllamaClient instances.
_circuit_breaker = _CircuitBreaker(failure_threshold=3, cooldown_seconds=30.0)


class OllamaClient:

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    async def generate_json(self, system_prompt: str, user_prompt: str):
        if _circuit_breaker.is_open():
            logger.warning("Ollama circuit breaker is open — failing fast.")
            raise LLMUnavailableError("Ollama circuit breaker open: recent failures, try again shortly.")

        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.7,
                "num_predict": settings.OLLAMA_NUM_PREDICT,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                _circuit_breaker.record_success()
                return data.get("message", {}).get("content", "")

        except httpx.TransportError as e:
            logger.error("Ollama unavailable (%s): %s", type(e).__name__, e)
            _circuit_breaker.record_failure()
            raise LLMUnavailableError(f"Ollama unavailable: {type(e).__name__}") from e

        except Exception as e:
            logger.error("Ollama error: %s", e)
            raise e

    async def stream_json(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncGenerator[str, None]:
        """
        Calls Ollama with stream=True and yields raw token strings as they
        arrive.  Each yielded value is the 'content' field from one Ollama
        chunk; callers are responsible for assembling the full text.
        """
        if _circuit_breaker.is_open():
            logger.warning("Ollama circuit breaker is open — failing fast on stream.")
            raise LLMUnavailableError("Ollama circuit breaker open: recent failures, try again shortly.")

        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": True,
            "format": "json",
            "options": {
                "temperature": 0.7,
                "num_predict": settings.OLLAMA_NUM_PREDICT,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, json=payload) as response:
                    response.raise_for_status()
                    received_any_token = False
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        token = data.get("message", {}).get("content", "")
                        if token:
                            received_any_token = True
                            yield token
                        if data.get("done", False):
                            break
                    if received_any_token:
                        _circuit_breaker.record_success()

        except httpx.TransportError as e:
            logger.error("Ollama unavailable during streaming (%s): %s", type(e).__name__, e)
            _circuit_breaker.record_failure()
            raise LLMUnavailableError(f"Ollama unavailable: {type(e).__name__}") from e

        except Exception as e:
            logger.error("Ollama streaming error: %s", e)
            raise e

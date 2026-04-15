"""
Synchronous Ollama client for offline pipeline scripts.

Intentionally separate from app/services/llm/ollama_client.py, which is async
and integrated with FastAPI.  Scripts need none of that machinery — a plain
requests.Session keeps things simple and dependency-free.

Schema produced by this service:
    {
        "title": "string",
        "summary": "string",
        "day_plans": [
            {"day": 1, "theme": "string", "content": "string"},
            ...
        ]
    }
"""
from __future__ import annotations

import json
import logging

import requests

logger = logging.getLogger(__name__)

# ── Defaults ──────────────────────────────────────────────────────────────────

_DEFAULT_BASE_URL = "http://localhost:11434"
_DEFAULT_MODEL = "llama3"
_DEFAULT_TIMEOUT = 120  # seconds

# ── Prompt templates ──────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a travel itinerary generator. Output ONLY valid JSON — no markdown, \
no explanation, no text outside the JSON object.

The JSON must match this exact structure:
{
  "title": "string — a short trip title",
  "summary": "string — 2 to 3 sentences describing the trip",
  "day_plans": [
    {
      "day": 1,
      "theme": "string — a short theme for this day (e.g. Historic Center)",
      "content": "string — 3 to 5 sentences describing what to do this day"
    }
  ]
}

Rules:
- Generate exactly the number of days requested. No more, no less.
- Every day_plan object must include all three fields: day, theme, content.
- content must be written in English only.
- Do not add any keys outside the schema above.
- Return valid JSON only.
"""


def _build_user_prompt(
    destination: str,
    country: str,
    days: int,
    budget: str,
    pace: str,
    interests: list[str],
) -> str:
    interest_str = ", ".join(interests)
    return (
        f"Generate a {days}-day {budget} itinerary for {destination}, {country}.\n"
        f"Pace: {pace}.\n"
        f"Interests: {interest_str}.\n"
        f"Generate exactly {days} day_plan entries.\n"
        "Return JSON only."
    )


# ── Validation ────────────────────────────────────────────────────────────────

def _validate(data: dict, expected_days: int) -> None:
    """Raise ValueError with a descriptive message if *data* does not conform."""
    for key in ("title", "summary", "day_plans"):
        if key not in data:
            raise ValueError(f"Missing required key: '{key}'")

    if not isinstance(data["title"], str) or not data["title"].strip():
        raise ValueError("'title' must be a non-empty string")

    if not isinstance(data["summary"], str) or not data["summary"].strip():
        raise ValueError("'summary' must be a non-empty string")

    day_plans = data["day_plans"]
    if not isinstance(day_plans, list) or len(day_plans) == 0:
        raise ValueError("'day_plans' must be a non-empty list")

    if len(day_plans) != expected_days:
        raise ValueError(
            f"Expected {expected_days} day_plans, got {len(day_plans)}"
        )

    for i, day in enumerate(day_plans):
        for field in ("day", "theme", "content"):
            if field not in day:
                raise ValueError(f"day_plans[{i}] is missing field '{field}'")
        if not isinstance(day["content"], str) or not day["content"].strip():
            raise ValueError(f"day_plans[{i}]['content'] must be a non-empty string")


# ── Service class ─────────────────────────────────────────────────────────────

class OllamaService:
    """Synchronous wrapper around the local Ollama /api/chat endpoint."""

    def __init__(
        self,
        base_url: str = _DEFAULT_BASE_URL,
        model: str = _DEFAULT_MODEL,
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def _chat(self, system: str, user: str) -> str:
        """POST to /api/chat and return the raw content string."""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.7,
                "num_predict": 8192,
            },
        }
        response = requests.post(
            f"{self.base_url}/api/chat",
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json().get("message", {}).get("content", "")

    def generate_itinerary(
        self,
        destination: str,
        country: str,
        days: int,
        budget: str,
        pace: str,
        interests: list[str],
    ) -> dict:
        """Generate, validate, and return a parsed itinerary dict.

        Raises ``ValueError`` if the model returns unparseable JSON or a
        response that does not conform to the expected schema.
        """
        user_prompt = _build_user_prompt(destination, country, days, budget, pace, interests)
        raw = self._chat(_SYSTEM_PROMPT, user_prompt)

        # Strip markdown fences that some models add despite instructions.
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            # Handle ```json ... ``` or ``` ... ```
            parts = cleaned.split("```")
            # parts[1] is the fenced block (possibly prefixed with "json\n")
            cleaned = parts[1].lstrip("json").strip() if len(parts) >= 2 else cleaned

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model returned invalid JSON: {exc}\n"
                f"Raw tail (last 300 chars): {cleaned[-300:]}"
            ) from exc

        _validate(data, expected_days=days)
        return data

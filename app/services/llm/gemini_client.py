# Path: app/services/llm/gemini_client.py
# Summary: Implements gemini client business logic.

import logging
from typing import AsyncGenerator

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.llm.ollama_client import LLMUnavailableError

logger = logging.getLogger(__name__)


class GeminiClient:

    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = settings.GEMINI_MODEL
        self._config = types.GenerateContentConfig(
            temperature=0.7,
            response_mime_type="application/json",
        )

    async def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=f"{system_prompt}\n\n{user_prompt}",
                config=self._config,
            )
            return response.text
        except Exception as e:
            logger.error("Gemini error: %s", e)
            raise LLMUnavailableError(f"Gemini unavailable: {e}") from e

    async def stream_json(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncGenerator[str, None]:
        try:
            async for chunk in await self._client.aio.models.generate_content_stream(
                model=self._model,
                contents=f"{system_prompt}\n\n{user_prompt}",
                config=self._config,
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error("Gemini streaming error: %s", e)
            raise LLMUnavailableError(f"Gemini unavailable: {e}") from e

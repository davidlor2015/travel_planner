# Path: app/services/embedding_service.py
# Summary: Implements embedding service business logic.

"""
Embedding service — wraps Ollama's mxbai-embed-large model.

Uses a requests-based singleton so importing this module carries no
startup cost.  1024 dimensions matches mxbai-embed-large and every
dependent table / index that references vector(1024).

Module-level embed_text() is provided for backward-compat with
embed_itineraries.py which imports it directly.
"""
from __future__ import annotations

import logging

import requests

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "mxbai-embed-large"
EMBEDDING_DIM = 1024


class EmbeddingService:
    """Thin synchronous wrapper around Ollama's /api/embeddings endpoint."""

    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = MODEL_NAME) -> None:
        self._url = f"{base_url}/api/embeddings"
        self._model = model

    def embed_text(self, text: str) -> list[float]:
        """Return a 1024-dim embedding for *text* as a plain Python list."""
        response = requests.post(
            self._url,
            json={"model": self._model, "prompt": text},
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["embedding"]


_service: EmbeddingService | None = None


def _get_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service


def embed_text(text: str) -> list[float]:
    """Module-level convenience wrapper — used by embed_itineraries.py."""
    return _get_service().embed_text(text)

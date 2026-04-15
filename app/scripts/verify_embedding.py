"""
Quick smoke-test for the Ollama mxbai-embed-large embedding service.

Run (from the project root with the venv active and Ollama running):
    python -m app.scripts.verify_embedding
"""
from app.services.embedding_service import EmbeddingService

service = EmbeddingService()
vector = service.embed_text("4 day Rome food and history trip")
print(f"Embedding length: {len(vector)}")
assert len(vector) == 1024, f"Expected 1024 dims, got {len(vector)}"
print("OK — mxbai-embed-large is reachable and returning 1024-dim vectors.")

# Path: app/scripts/embed_itineraries.py
# Summary: Implements embed itineraries functionality.

# app/scripts/embed_itineraries.py
"""
Read itinerary records from a JSON file, build text chunks, embed them,
and upsert into the itinerary_chunks Postgres/pgvector table.

Run standalone:
    python -m app.scripts.embed_itineraries --data-path data/generated_itineraries.json

Or import run() to call from the pipeline orchestrator.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

from app.services.embedding_service import EmbeddingService, MODEL_NAME
from app.services.vector_store import upsert_chunks, chunk_count

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

DEFAULT_DATA_PATH = Path("data/seed_itineraries.json")
DEFAULT_BATCH_SIZE = 50

_REQUIRED = {
    "itinerary_id", "destination", "country", "days",
    "budget", "interests", "pace", "source_type",
    "title", "summary", "day_plans",
}


# ── Validation ────────────────────────────────────────────────────────────────

def _is_valid(record: dict) -> bool:
    missing = _REQUIRED - set(record.keys())
    if missing:
        logger.warning(
            "Skipping %r — missing fields: %s",
            record.get("itinerary_id", "<no-id>"), sorted(missing),
        )
        return False
    if not isinstance(record.get("day_plans"), list) or not record["day_plans"]:
        logger.warning("Skipping %r — empty or invalid day_plans", record.get("itinerary_id"))
        return False
    return True


# ── Chunk builders ────────────────────────────────────────────────────────────

def _overview_content(record: dict) -> str:
    interests = ", ".join(record["interests"])
    return (
        f"{record['title']}\n\n"
        f"{record['summary']}\n\n"
        f"Destination: {record['destination']}, {record['country']}. "
        f"{record['days']} days. "
        f"Budget: {record['budget']}. "
        f"Pace: {record['pace']}. "
        f"Interests: {interests}."
    )


def _day_content(day: dict) -> str:
    lines = [f"Day {day['day_number']}: {day['theme']}"]
    for act in day.get("activities", []):
        lines.append(
            f"[{act.get('time', '?')}] {act['title']} — "
            f"{act.get('location', '')}. "
            f"{act.get('notes', '')} "
            f"({act.get('cost_estimate', 'cost unknown')})"
        )
    return "\n".join(lines)


def build_chunks(record: dict) -> list[dict[str, Any]]:
    base: dict[str, Any] = {
        "itinerary_id": record["itinerary_id"],
        "destination":  record["destination"],
        "country":      record["country"],
        "days":         record["days"],
        "budget":       record["budget"],
        "interests":    record["interests"],
        "pace":         record["pace"],
        "source_type":  record["source_type"],
    }
    chunks: list[dict[str, Any]] = [
        {
            **base,
            "chunk_type": "overview",
            "day_number": None,
            "title":      record["title"],
            "content":    _overview_content(record),
        }
    ]
    for day in record["day_plans"]:
        chunks.append({
            **base,
            "chunk_type": "day",
            "day_number": day["day_number"],
            "title":      f"Day {day['day_number']}: {day['theme']}",
            "content":    _day_content(day),
        })
    return chunks


# ── Public interface ──────────────────────────────────────────────────────────

def run(
    data_path: Path,
    embed_model: str = MODEL_NAME,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> dict:
    """Embed records from *data_path* and upsert into itinerary_chunks.

    Returns a summary dict: records_loaded, records_valid, records_skipped,
    chunks_inserted, total_rows.

    Raises FileNotFoundError if *data_path* does not exist.
    """
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    with data_path.open(encoding="utf-8") as f:
        records: list[dict] = json.load(f)

    logger.info(
        "Loaded %d records from %s | embed model: %s",
        len(records), data_path, embed_model,
    )

    valid = [r for r in records if _is_valid(r)]
    skipped = len(records) - len(valid)
    if skipped:
        logger.warning("Skipped %d invalid record(s).", skipped)

    embedder = EmbeddingService(model=embed_model)
    total_inserted = 0
    batch: list[dict] = []

    for idx, record in enumerate(valid, start=1):
        chunks = build_chunks(record)
        for chunk in chunks:
            chunk["embedding"] = embedder.embed_text(chunk["content"])
        batch.extend(chunks)

        if len(batch) >= batch_size or idx == len(valid):
            total_inserted += upsert_chunks(batch)
            logger.info(
                "Progress: %d/%d records | %d chunks inserted so far",
                idx, len(valid), total_inserted,
            )
            batch = []

    total_rows = chunk_count()
    logger.info(
        "Embedding complete: %d chunks from %d records. "
        "Total rows in itinerary_chunks: %d.",
        total_inserted, len(valid), total_rows,
    )
    return {
        "records_loaded":  len(records),
        "records_valid":   len(valid),
        "records_skipped": skipped,
        "chunks_inserted": total_inserted,
        "total_rows":      total_rows,
    }


# ── CLI entry point ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Embed itinerary records and upsert into pgvector.",
    )
    parser.add_argument(
        "--data-path", default=str(DEFAULT_DATA_PATH), metavar="PATH",
        help=f"Path to the itinerary JSON file (default: {DEFAULT_DATA_PATH})",
    )
    parser.add_argument(
        "--embed-model", default=MODEL_NAME, metavar="MODEL",
        help=f"Ollama embedding model (default: {MODEL_NAME})",
    )
    parser.add_argument(
        "--batch-size", type=int, default=DEFAULT_BATCH_SIZE, metavar="N",
        help=f"Upsert batch size (default: {DEFAULT_BATCH_SIZE})",
    )
    args = parser.parse_args()

    try:
        run(
            data_path=Path(args.data_path),
            embed_model=args.embed_model,
            batch_size=args.batch_size,
        )
    except FileNotFoundError as exc:
        logger.error("%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()

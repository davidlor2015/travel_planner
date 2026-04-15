"""
Read itinerary records from a JSON file, build text chunks, embed them,
and upsert into the itinerary_chunks Postgres table.

Run:
    python -m app.scripts.embed_itineraries

Switch between seed and generated data by changing DATA_PATH below.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

from app.services.embedding_service import embed_text
from app.services.vector_store import upsert_chunks, chunk_count

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# Switch this path to data/generated_itineraries.json for bulk data.
DATA_PATH = Path("data/seed_itineraries.json")

# Rows are inserted in batches to avoid holding large lists in memory.
BATCH_SIZE = 50


_REQUIRED = {
    "itinerary_id", "destination", "country", "days",
    "budget", "interests", "pace", "source_type",
    "title", "summary", "day_plans",
}


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



def _overview_content(record: dict) -> str:
    """Build the text for the overview chunk."""
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
    """Build the text for a single day chunk."""
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
    """Return a list of chunk dicts ready for insertion (without embeddings)."""
    base: dict[str, Any] = {
        "itinerary_id": record["itinerary_id"],
        "destination":  record["destination"],
        "country":      record["country"],
        "days":         record["days"],
        "budget":       record["budget"],
        "interests":    record["interests"],   # TEXT[] — psycopg2 handles list→array
        "pace":         record["pace"],
        "source_type":  record["source_type"],
    }

    chunks: list[dict[str, Any]] = []

    # Overview chunk
    chunks.append({
        **base,
        "chunk_type": "overview",
        "day_number": None,
        "title":      record["title"],
        "content":    _overview_content(record),
    })

    # One chunk per day
    for day in record["day_plans"]:
        chunks.append({
            **base,
            "chunk_type": "day",
            "day_number": day["day_number"],
            "title":      f"Day {day['day_number']}: {day['theme']}",
            "content":    _day_content(day),
        })

    return chunks



def main() -> None:
    if not DATA_PATH.exists():
        logger.error("Data file not found: %s", DATA_PATH)
        sys.exit(1)

    with DATA_PATH.open(encoding="utf-8") as f:
        records: list[dict] = json.load(f)

    logger.info("Loaded %d records from %s", len(records), DATA_PATH)

    valid = [r for r in records if _is_valid(r)]
    skipped = len(records) - len(valid)
    if skipped:
        logger.warning("Skipped %d invalid record(s).", skipped)

    total_inserted = 0
    batch: list[dict] = []

    for idx, record in enumerate(valid, start=1):
        chunks = build_chunks(record)

        for chunk in chunks:
            chunk["embedding"] = embed_text(chunk["content"])

        batch.extend(chunks)

        if len(batch) >= BATCH_SIZE or idx == len(valid):
            total_inserted += upsert_chunks(batch)
            logger.info(
                "Progress: %d/%d records | %d chunks inserted so far",
                idx, len(valid), total_inserted,
            )
            batch = []

    rows_now = chunk_count()
    logger.info(
        "Done. Inserted %d chunks from %d records. "
        "Total rows in itinerary_chunks: %d.",
        total_inserted, len(valid), rows_now,
    )


if __name__ == "__main__":
    main()

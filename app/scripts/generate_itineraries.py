"""
Mass-generate itinerary records using the local Ollama model and save them to
data/generated_itineraries.json.

Run (from the project root with the venv active):
    python -m app.scripts.generate_itineraries

Adjust the generation matrix constants below (DESTINATIONS, INTEREST_COMBOS,
etc.) to expand or shrink the batch.  Each combination triggers one Ollama
call, so total time scales linearly with the number of combinations.

This script only handles generation — no embeddings, no database writes.
Feed the output to embed_itineraries.py for the next pipeline stage.
"""
from __future__ import annotations

import json
import logging
import sys
import time
from itertools import product
from pathlib import Path

from app.services.ollama_service import OllamaService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

OUTPUT_PATH = Path("data/generated_itineraries.json")



DESTINATIONS: list[tuple[str, str]] = [
    ("Rome",          "Italy"),
    ("Paris",         "France"),
    ("Tokyo",         "Japan"),
    ("Barcelona",     "Spain"),
    ("New York City", "USA"),
]

INTEREST_COMBOS: list[list[str]] = [
    ["food", "history", "walking"],
    ["culture", "food", "city exploration"],
    ["nightlife", "food", "shopping"],
    ["landmarks", "walking", "photography"],
]

DAYS_OPTIONS:   list[int] = [3, 5, 7]
BUDGET_OPTIONS: list[str] = ["budget", "moderate"]
PACE_OPTIONS:   list[str] = ["relaxed", "balanced"]

# Set to None to generate all combinations (currently 240).
MAX_RECORDS: int | None = 20


def _make_id(
    destination: str,
    days: int,
    budget: str,
    pace: str,
    interests: list[str],
) -> str:
    """Build a deterministic, human-readable itinerary ID."""
    dest_slug    = destination.lower().replace(" ", "-")
    interest_slug = "-".join(i.split()[0][:4] for i in interests)
    return f"{dest_slug}-{days}d-{budget[:3]}-{interest_slug}-{pace[:3]}"


def _build_plan() -> list[dict]:
    """Return every parameter combination as a flat list of dicts."""
    combos = []
    for (dest, country), interests, days, budget, pace in product(
        DESTINATIONS, INTEREST_COMBOS, DAYS_OPTIONS, BUDGET_OPTIONS, PACE_OPTIONS,
    ):
        combos.append({
            "destination": dest,
            "country":     country,
            "days":        days,
            "budget":      budget,
            "pace":        pace,
            "interests":   list(interests),  # avoid shared list references
        })
    return combos


def _save(records: list[dict]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)




def main() -> None:
    plan = _build_plan()
    if MAX_RECORDS is not None:
        plan = plan[:MAX_RECORDS]
    total = len(plan)
    logger.info("Generation plan: %d combinations.", total)
    logger.info("Output file:     %s", OUTPUT_PATH.resolve())

    service = OllamaService(model="qwen2.5:14b")
    results: list[dict] = []
    failed  = 0

    for idx, params in enumerate(plan, start=1):
        dest = params["destination"]
        logger.info(
            "[%d/%d] %s — %dd | budget=%s | pace=%s | interests=%s",
            idx, total,
            dest, params["days"], params["budget"], params["pace"],
            ", ".join(params["interests"]),
        )

        t0 = time.monotonic()
        try:
            data = service.generate_itinerary(
                destination=params["destination"],
                country=    params["country"],
                days=       params["days"],
                budget=     params["budget"],
                pace=       params["pace"],
                interests=  params["interests"],
            )
        except Exception as exc:
            logger.error("  FAILED (%s): %s", type(exc).__name__, exc)
            failed += 1
            continue

        elapsed = time.monotonic() - t0

        itinerary_id = _make_id(
            params["destination"],
            params["days"],
            params["budget"],
            params["pace"],
            params["interests"],
        )

        record: dict = {
            "itinerary_id": itinerary_id,
            "destination":  params["destination"],
            "country":      params["country"],
            "days":         params["days"],
            "budget":       params["budget"],
            "interests":    params["interests"],
            "pace":         params["pace"],
            "title":        data.get("title", f"{params['days']}-Day {dest} Trip"),
            "summary":      data.get("summary", ""),
            "day_plans":    data.get("day_plans", []),
        }
        results.append(record)

        logger.info(
            "  OK in %.1fs — %d day(s) saved. ID: %s",
            elapsed, len(record["day_plans"]), itinerary_id,
        )

        # Incremental save after every successful record so a mid-run
        # interruption does not lose completed work.
        _save(results)

    logger.info(
        "Done: %d/%d succeeded, %d failed. Output: %s",
        len(results), total, failed, OUTPUT_PATH,
    )

    if failed:
        logger.warning("%d combination(s) failed — check logs above.", failed)
        sys.exit(1)


if __name__ == "__main__":
    main()

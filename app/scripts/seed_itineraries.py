# Path: app/scripts/seed_itineraries.py
# Summary: Implements seed itineraries functionality.

"""
Validate the seed itinerary file and print a summary.

Run:
    python -m app.scripts.seed_itineraries

This script does NOT embed or insert anything — it only checks that
data/seed_itineraries.json is well-formed so the embedding script can
safely consume it.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

DATA_PATH = Path("data/seed_itineraries.json")

REQUIRED_TOP_LEVEL = {
    "itinerary_id", "destination", "country", "days",
    "budget", "interests", "pace", "source_type",
    "title", "summary", "day_plans",
}
REQUIRED_DAY = {"day_number", "theme", "activities"}
REQUIRED_ACTIVITY = {"time", "title", "location", "notes", "cost_estimate"}


def validate(record: dict) -> list[str]:
    """Return a list of validation error strings, empty if the record is valid."""
    errors: list[str] = []
    iid = record.get("itinerary_id", "<no id>")

    missing_top = REQUIRED_TOP_LEVEL - set(record.keys())
    if missing_top:
        errors.append(f"[{iid}] Missing top-level fields: {sorted(missing_top)}")

    if not isinstance(record.get("interests"), list):
        errors.append(f"[{iid}] 'interests' must be a list")

    day_plans = record.get("day_plans", [])
    if not isinstance(day_plans, list) or len(day_plans) == 0:
        errors.append(f"[{iid}] 'day_plans' must be a non-empty list")
        return errors

    expected_days = record.get("days", 0)
    if len(day_plans) != expected_days:
        errors.append(
            f"[{iid}] 'days'={expected_days} but day_plans has {len(day_plans)} entries"
        )

    for day in day_plans:
        missing_day = REQUIRED_DAY - set(day.keys())
        if missing_day:
            errors.append(f"[{iid}] Day {day.get('day_number','?')} missing: {sorted(missing_day)}")
        for act in day.get("activities", []):
            missing_act = REQUIRED_ACTIVITY - set(act.keys())
            if missing_act:
                errors.append(
                    f"[{iid}] Day {day.get('day_number','?')} activity missing: {sorted(missing_act)}"
                )

    return errors


def main() -> None:
    if not DATA_PATH.exists():
        logger.error("Seed file not found: %s", DATA_PATH)
        sys.exit(1)

    with DATA_PATH.open() as f:
        records: list[dict] = json.load(f)

    logger.info("Loaded %d seed records from %s", len(records), DATA_PATH)

    all_errors: list[str] = []
    for record in records:
        all_errors.extend(validate(record))

    if all_errors:
        for err in all_errors:
            logger.error(err)
        logger.error("%d validation error(s) found.", len(all_errors))
        sys.exit(1)

    for r in records:
        logger.info(
            "  ✓ %-55s  %2dd  %-10s  %s",
            r["itinerary_id"], r["days"], r["budget"],
            ", ".join(r["interests"]),
        )

    logger.info("All %d seed records are valid.", len(records))


if __name__ == "__main__":
    main()

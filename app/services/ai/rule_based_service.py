# Path: app/services/ai/rule_based_service.py
# Summary: Implements rule based service business logic.

import asyncio
import logging
from datetime import timedelta
from typing import Optional

import httpx
from cachetools import TTLCache

from app.core.config import settings
from app.models.trip import Trip
from app.schemas.ai import DayPlan, ItineraryItem, ItineraryResponse

# ---------------------------------------------------------------------------
# Module-level in-memory caches
# ---------------------------------------------------------------------------
_geocode_cache: TTLCache = TTLCache(maxsize=256, ttl=86_400)   # 24 h
_poi_cache: TTLCache = TTLCache(maxsize=256, ttl=3_600)        # 1 h

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OPENTRIPMAP_BASE = "https://api.opentripmap.com/0.1/en/places"

# Maps interest keywords → OpenTripMap category strings
INTEREST_KINDS: dict[str, str] = {
    "food":      "foods",
    "history":   "historic",
    "nature":    "natural",
    "art":       "museums,art_galleries",
    "shopping":  "shops",
    "religion":  "religion",
    "beach":     "beaches",
    "sport":     "sport",
    "nightlife": "bars,clubs",
}
DEFAULT_KINDS = "interesting_places"

DAY_TIMES = ["09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM"]

# ── Tunable constants ────────────────────────────────────────────────────────

# Maximum number of POIs returned per API call.  Raised to 100 so we have
# enough headroom for the 2× buffer after the filtering pipeline.
FETCH_LIMIT = 100

# Hard ceiling on itinerary length.  14 days covers typical long-haul trips.
MAX_DAYS = 14

# Number of activities scheduled per day.
ACTS_PER_DAY = 3

# Days with fewer valid POIs than this are dropped rather than emitted empty.
MIN_ACTS_PER_DAY = 1

# Candidate multiplier: we rank (target_days × ACTS_PER_DAY × CANDIDATE_BUFFER)
# POIs so the filtering pipeline has room to discard bad ones without starving
# later days.
CANDIDATE_BUFFER = 3

# Search radii tried in order when there are insufficient ranked candidates.
# A 5 km radius covers a typical city centre; 10/15 km catches outlying areas.
_SEARCH_RADII: tuple[int, ...] = (5_000, 10_000, 15_000)

# Minimum fraction of target days that must be fillable.  If we can only fill
# fewer than this, we log a warning and return what we have rather than an
# error — a partial itinerary is better than nothing.
_MIN_DAY_COVERAGE = 0.5

# ── Filtering constants ──────────────────────────────────────────────────────

_BLOCKED_KINDS: frozenset[str] = frozenset({
    "roads", "route", "bridges", "tunnels",
    "transport", "railway", "airports", "ferries",
    "addresses", "administrative_divisions", "districts",
    "urban_environment", "parking",
    "atm", "banks", "hospitals", "medical", "emergency",
    "accommodation", "hotels", "hostels",
    "other_buildings",
})

_FOOD_VALID_KINDS: frozenset[str] = frozenset({
    "foods", "restaurants", "cafes", "bars", "fast_food",
    "food_courts", "bakeries", "confectioneries", "markets",
    "pubs", "biergartens",
})

_DESCRIPTION_RED_FLAGS: tuple[str, ...] = (
    "hotel", "hostel", "motel", "resort", "accommodation",
    "ward", "borough", "district", "province", "administrative",
    "roundabout", "intersection", "junction",
    "highway", "motorway", "boulevard", "traffic",
    "railway station", "bus station", "transport hub",
)

_ENGLISH_CODEPOINT_CEILING = 0x024F
_NON_ENGLISH_RATIO_LIMIT = 0.10


# ── HTTP helpers ─────────────────────────────────────────────────────────────

async def _geocode(destination: str) -> tuple[float, float]:
    cache_key = destination.strip().lower()
    if cache_key in _geocode_cache:
        logger.debug("Geocode cache hit for %r", destination)
        return _geocode_cache[cache_key]

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            NOMINATIM_URL,
            params={"q": destination, "format": "json", "limit": 1},
            headers={"User-Agent": "travel-planner-portfolio-app"},
        )
        response.raise_for_status()
        data = response.json()

    if not data:
        raise ValueError(
            f"Could not find location: '{destination}'. Try a more specific city name."
        )

    result = float(data[0]["lat"]), float(data[0]["lon"])
    _geocode_cache[cache_key] = result
    return result


async def _fetch_pois(lat: float, lon: float, kinds: str, radius: int = 5_000) -> list[dict]:
    """Fetch up to FETCH_LIMIT POIs from OpenTripMap within `radius` metres.

    Cache key includes the radius so a 10 km retry does not collide with the
    initial 5 km result.  Rating threshold is 1 (worth seeing) rather than 2
    (notable) to widen the candidate pool — quality filtering happens in
    _rank_pois after we have a fuller picture.
    """
    cache_key = (round(lat, 3), round(lon, 3), kinds, radius)
    if cache_key in _poi_cache:
        logger.debug("POI cache hit: key=%s", cache_key)
        return _poi_cache[cache_key]

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{OPENTRIPMAP_BASE}/radius",
            params={
                "radius": radius,
                "lon": lon,
                "lat": lat,
                "kinds": kinds,
                "limit": FETCH_LIMIT,
                "rate": 1,          # was 2 — now includes "worth seeing" places
                "format": "json",
                "apikey": settings.OPENTRIPMAP_API_KEY,
            },
        )
        response.raise_for_status()
        data = response.json()
        pois = data if isinstance(data, list) else data.get("features", [])
        logger.info(
            "OpenTripMap: radius=%dm kinds=%s → %d raw POIs",
            radius, kinds, len(pois),
        )

    _poi_cache[cache_key] = pois
    return pois


async def _fetch_poi_description(xid: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                f"{OPENTRIPMAP_BASE}/xid/{xid}",
                params={"apikey": settings.OPENTRIPMAP_API_KEY},
            )
            response.raise_for_status()
            data = response.json()
            extract = (data.get("wikipedia_extracts") or {}).get("text") or ""
            if extract:
                return extract[:300].rsplit(" ", 1)[0] + "…" if len(extract) > 300 else extract
            return (data.get("info") or {}).get("descr") or ""
    except Exception:
        return ""


async def _enrich_with_descriptions(pois: list[dict]) -> dict[str, str]:
    xids = [_props(p).get("xid") for p in pois]
    results = await asyncio.gather(*[_fetch_poi_description(xid) for xid in xids if xid])
    return {xid: desc for xid, desc in zip((x for x in xids if x), results)}


# ── POI normalisation helpers ────────────────────────────────────────────────

def _props(poi: dict) -> dict:
    return poi.get("properties") or poi


def _kinds_set(poi: dict) -> frozenset[str]:
    raw: str = _props(poi).get("kinds", "")
    return frozenset(k.strip().lower() for k in raw.split(",") if k.strip())


def _score_poi(poi: dict) -> int:
    return _props(poi).get("rate", 0) * 10


def _cost_label(budget: str) -> str:
    if budget == "budget":
        return "Free–$10"
    if budget == "luxury":
        return "$30–$100+"
    return "$10–$30"


# ── Filtering ────────────────────────────────────────────────────────────────

def _is_valid_poi(poi: dict, food_mode: bool) -> bool:
    props = _props(poi)
    name: str = (props.get("name") or "").strip()
    if not name:
        return False

    kinds = _kinds_set(poi)

    if kinds & _BLOCKED_KINDS:
        logger.debug("Rejected %r — blocked kinds: %s", name, kinds & _BLOCKED_KINDS)
        return False

    if food_mode and not (kinds & _FOOD_VALID_KINDS):
        logger.debug("Rejected %r — no food kinds (kinds=%s)", name, kinds)
        return False

    return True


def _validate_description(description: str, poi_kinds: frozenset[str]) -> bool:
    if not description:
        return True
    desc_lower = description.lower()
    for flag in _DESCRIPTION_RED_FLAGS:
        if flag in desc_lower and flag not in poi_kinds:
            logger.debug("Description rejected — red-flag %r not in kinds %s", flag, poi_kinds)
            return False
    return True


def _is_english(text: str) -> bool:
    if not text:
        return True
    alpha_chars = [ch for ch in text if ch.isalpha()]
    if not alpha_chars:
        return True
    non_english = sum(1 for ch in alpha_chars if ord(ch) > _ENGLISH_CODEPOINT_CEILING)
    ratio = non_english / len(alpha_chars)
    if ratio > _NON_ENGLISH_RATIO_LIMIT:
        logger.debug(
            "Language check failed — %.0f%% non-English chars (limit %.0f%%)",
            ratio * 100, _NON_ENGLISH_RATIO_LIMIT * 100,
        )
        return False
    return True


def _make_fallback_description(props: dict, category: str, destination: str) -> str:
    kinds_raw: str = props.get("kinds", "")
    primary_kind = (
        kinds_raw.split(",")[0].replace("_", " ").strip().capitalize()
        if kinds_raw
        else category
    )
    return f"{primary_kind} in {destination}."


# ── Ranking ──────────────────────────────────────────────────────────────────

def _rank_pois(pois: list[dict], limit: int, food_mode: bool) -> list[dict]:
    """Filter out invalid POIs, deduplicate by name, sort by rating, return top `limit`."""
    seen_names: set[str] = set()
    ranked: list[dict] = []
    rejected = 0

    for poi in sorted(pois, key=_score_poi, reverse=True):
        if not _is_valid_poi(poi, food_mode):
            rejected += 1
            continue
        name: str = _props(poi).get("name") or ""
        if name not in seen_names:
            seen_names.add(name)
            ranked.append(poi)
        if len(ranked) >= limit:
            break

    logger.info(
        "Ranking: %d kept / %d rejected (food_mode=%s)",
        len(ranked), rejected, food_mode,
    )
    return ranked


# ── Assembly ─────────────────────────────────────────────────────────────────

def _assemble_itinerary(
    trip: Trip,
    ranked: list[dict],
    target_days: int,
    interests: list[str],
    budget: str,
    descriptions: dict[str, str] | None = None,
) -> ItineraryResponse:
    """Build the ItineraryResponse from pre-ranked POIs.

    `target_days` is the caller-determined number of days to attempt — this
    function does NOT recompute it from trip dates so there is a single source
    of truth.  Days whose POI slice is empty are skipped rather than emitted.
    """
    start = trip.start_date
    cost = _cost_label(budget)
    days: list[DayPlan] = []

    logger.info(
        "Assembly start: target_days=%d ranked=%d acts_per_day=%d",
        target_days, len(ranked), ACTS_PER_DAY,
    )

    for day_idx in range(target_days):
        slice_ = ranked[day_idx * ACTS_PER_DAY : (day_idx + 1) * ACTS_PER_DAY]

        if len(slice_) < MIN_ACTS_PER_DAY:
            logger.info(
                "Day %d skipped — slice has %d POIs (need ≥%d); stopping here.",
                day_idx + 1, len(slice_), MIN_ACTS_PER_DAY,
            )
            break

        items: list[ItineraryItem] = []
        for i, poi in enumerate(slice_):
            props = _props(poi)
            kinds = _kinds_set(poi)
            raw_kinds: str = props.get("kinds", "")
            category = (
                raw_kinds.split(",")[0].replace("_", " ").title()
                if raw_kinds
                else "Attraction"
            )

            xid = props.get("xid")
            raw_desc = (descriptions or {}).get(xid, "") if xid else ""

            desc_ok = (
                bool(raw_desc)
                and _validate_description(raw_desc, kinds)
                and _is_english(raw_desc)
            )
            if desc_ok:
                notes = raw_desc
            else:
                if raw_desc:
                    reason = "non-English" if not _is_english(raw_desc) else "semantic mismatch"
                    logger.info(
                        "Description discarded for %r — %s; using fallback",
                        props.get("name"), reason,
                    )
                notes = _make_fallback_description(props, category, trip.destination)

            items.append(ItineraryItem(
                time=DAY_TIMES[i % len(DAY_TIMES)],
                title=props.get("name") or "Local Attraction",
                location=trip.destination,
                notes=notes,
                cost_estimate=cost,
            ))

        days.append(DayPlan(
            day_number=day_idx + 1,
            date=str(start + timedelta(days=day_idx)),
            items=items,
        ))

    actual_days = len(days)
    logger.info(
        "Assembly complete: %d/%d days filled (%.0f%% coverage)",
        actual_days, target_days,
        100 * actual_days / target_days if target_days else 0,
    )

    interest_label = ", ".join(interests) if interests else "general sightseeing"
    dest = trip.destination.title()

    suffix = ""
    if actual_days < target_days:
        suffix = f" (limited to {actual_days} days due to available data)"

    return ItineraryResponse(
        title=f"{actual_days}-Day {dest} Trip",
        summary=(
            f"A {budget} {actual_days}-day itinerary in {dest} "
            f"focused on {interest_label}. Activities sourced from OpenStreetMap."
            f"{suffix}"
        ),
        days=days,
    )


# ── Entry point ───────────────────────────────────────────────────────────────

def _resolve_kinds(interests: list[str]) -> str:
    kinds = [INTEREST_KINDS[i] for i in interests if i in INTEREST_KINDS]
    return ",".join(kinds) if kinds else DEFAULT_KINDS


async def _fetch_with_radius_expansion(
    lat: float,
    lon: float,
    kinds: str,
    min_candidates: int,
    food_mode: bool,
) -> list[dict]:
    """Try progressively larger radii until we have enough filtered candidates.

    Returns the ranked POI list from the first radius that yields at least
    `min_candidates`.  Falls back to the broadest radius regardless if none
    meets the threshold, so we always return the best we can.
    """
    best_ranked: list[dict] = []

    for radius in _SEARCH_RADII:
        raw_pois = await _fetch_pois(lat, lon, kinds, radius=radius)
        ranked = _rank_pois(raw_pois, limit=min_candidates * CANDIDATE_BUFFER, food_mode=food_mode)
        logger.info(
            "Radius %dm: %d raw → %d ranked (need %d)",
            radius, len(raw_pois), len(ranked), min_candidates,
        )
        if len(ranked) > len(best_ranked):
            best_ranked = ranked
        if len(ranked) >= min_candidates:
            logger.info("Sufficient candidates found at radius %dm", radius)
            return ranked

    logger.warning(
        "Radius expansion exhausted — best was %d candidates (needed %d)",
        len(best_ranked), min_candidates,
    )
    return best_ranked


async def generate_rule_based_itinerary(
    trip: Trip,
    interests_override: Optional[str],
    budget_override: Optional[str],
) -> ItineraryResponse:
    """
    Main entry point.

    Pipeline stages:
      1. Log and validate dates / duration.
      2. Resolve interest kinds.
      3. Geocode destination.
      4. Fetch candidates with radius expansion if needed.
      5. Fallback to DEFAULT_KINDS if interest-specific fetch is empty.
      6. Validate semantic / language fit of descriptions.
      7. Assemble itinerary, skipping unpopulated days.
      8. Enforce minimum day coverage.
    """
    budget = (budget_override or "moderate").strip().lower()
    raw_interests = interests_override or ""
    interests = [i.strip().lower() for i in raw_interests.split(",") if i.strip()]

    # ── Stage 1: date / duration ──────────────────────────────────────────────
    start = trip.start_date
    end = trip.end_date
    total_calendar_days = (end - start).days + 1  # inclusive
    requested_days = min(total_calendar_days, MAX_DAYS)

    logger.info(
        "Smart Plan | trip_id=%s dest=%r start=%s end=%s "
        "calendar_days=%d requested_days=%d (cap=%d)",
        trip.id, trip.destination, start, end,
        total_calendar_days, requested_days, MAX_DAYS,
    )

    # ── Stage 2: resolve kinds ────────────────────────────────────────────────
    kinds = _resolve_kinds(interests)
    food_mode = "foods" in kinds
    logger.info(
        "Interests: %r → kinds=%r food_mode=%s budget=%r",
        interests, kinds, food_mode, budget,
    )

    # ── Stage 3: geocode ──────────────────────────────────────────────────────
    lat, lon = await _geocode(trip.destination)

    # ── Stage 4: fetch with radius expansion ─────────────────────────────────
    min_candidates = requested_days * ACTS_PER_DAY
    ranked = await _fetch_with_radius_expansion(lat, lon, kinds, min_candidates, food_mode)

    # ── Stage 5: fallback to broad category if interest-specific fetch fails ──
    if not ranked:
        logger.warning(
            "No valid candidates for kinds=%s — retrying with DEFAULT_KINDS=%s food_mode=False",
            kinds, DEFAULT_KINDS,
        )
        ranked = await _fetch_with_radius_expansion(
            lat, lon, DEFAULT_KINDS, min_candidates, food_mode=False
        )

    if not ranked:
        raise ValueError(
            f"No attractions found near '{trip.destination}'. "
            "Try a larger or better-known city."
        )

    # ── Stage 6: descriptions (fetched in parallel, validated per-item) ───────
    descriptions = await _enrich_with_descriptions(ranked)

    # ── Stage 7: compute achievable days based on available candidates ────────
    achievable_days = min(requested_days, len(ranked) // ACTS_PER_DAY or 1)
    if achievable_days < requested_days:
        logger.warning(
            "Candidate shortfall: have %d ranked POIs, need %d for %d full days. "
            "Generating %d days instead.",
            len(ranked), requested_days * ACTS_PER_DAY, requested_days, achievable_days,
        )
    else:
        logger.info(
            "Full coverage: %d ranked POIs → %d days × %d acts",
            len(ranked), achievable_days, ACTS_PER_DAY,
        )

    # ── Stage 8: assemble ─────────────────────────────────────────────────────
    itinerary = _assemble_itinerary(
        trip, ranked, achievable_days, interests, budget, descriptions
    )

    if not itinerary.days:
        raise ValueError(
            f"Could not build a valid itinerary for '{trip.destination}'. "
            "Too few quality venues found. Try different interests or a larger city."
        )

    # Warn (but do not error) if coverage is below threshold
    coverage = len(itinerary.days) / requested_days if requested_days else 1
    if coverage < _MIN_DAY_COVERAGE and requested_days > 1:
        logger.warning(
            "Low itinerary coverage: %d/%d days (%.0f%%) for trip_id=%s. "
            "Consider broader interests or larger search radius.",
            len(itinerary.days), requested_days, coverage * 100, trip.id,
        )

    return itinerary

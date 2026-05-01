# Path: app/services/destination_search_service.py
# Summary: Provides destination search backed by Nominatim.

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.schemas.search import DestinationSearchResult

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_USER_AGENT = "Waypoint/1.0 destination-search"
MAX_DESTINATION_RESULTS = 8


class DestinationSearchProviderError(RuntimeError):
    """Raised when the destination search provider is unavailable."""


def _as_text(value: Any) -> str | None:
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed or None
    if isinstance(value, int | float):
        return str(value)
    return None


def _as_float(value: Any) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return slug.strip("-") or "destination"


def _normalized_key(value: str) -> str:
    return " ".join(value.casefold().split())


def _region_from_address(address: dict[str, Any]) -> str | None:
    for key in (
        "state",
        "region",
        "province",
        "state_district",
        "county",
        "municipality",
    ):
        text = _as_text(address.get(key))
        if text:
            return text
    return None


def _name_from_row(row: dict[str, Any], display_name: str, address: dict[str, Any]) -> str:
    for key in ("name", "city", "town", "village", "municipality", "county", "state"):
        text = _as_text(row.get(key)) or _as_text(address.get(key))
        if text:
            return text
    return display_name.split(",", 1)[0].strip() or display_name


def _id_from_row(row: dict[str, Any], display_name: str) -> str:
    place_id = _as_text(row.get("place_id"))
    if place_id:
        return f"nominatim:{place_id}"

    osm_type = _as_text(row.get("osm_type"))
    osm_id = _as_text(row.get("osm_id"))
    if osm_type and osm_id:
        return f"nominatim:{osm_type}:{osm_id}"

    return f"nominatim:{_slugify(display_name)}"


def _normalize_destination_row(row: dict[str, Any]) -> DestinationSearchResult | None:
    display_name = _as_text(row.get("display_name"))
    latitude = _as_float(row.get("lat"))
    longitude = _as_float(row.get("lon"))
    if not display_name or latitude is None or longitude is None:
        return None

    raw_address = row.get("address")
    address = raw_address if isinstance(raw_address, dict) else {}
    country_code = _as_text(address.get("country_code"))

    return DestinationSearchResult(
        id=_id_from_row(row, display_name),
        name=_name_from_row(row, display_name, address),
        displayName=display_name,
        latitude=latitude,
        longitude=longitude,
        country=_as_text(address.get("country")),
        countryCode=country_code.upper() if country_code else None,
        region=_region_from_address(address),
        source="nominatim",
    )


async def search_destinations(query: str) -> list[DestinationSearchResult]:
    normalized_query = query.strip()
    if not normalized_query:
        return []

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                NOMINATIM_SEARCH_URL,
                params={
                    "q": normalized_query,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": MAX_DESTINATION_RESULTS,
                    "dedupe": 1,
                    "accept-language": "en",
                },
                headers={"User-Agent": NOMINATIM_USER_AGENT},
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.exception("Destination search provider failed")
        raise DestinationSearchProviderError(
            "Destination search provider unavailable"
        ) from exc

    if not isinstance(payload, list):
        logger.warning("Destination search provider returned non-list payload")
        return []

    seen: set[str] = set()
    results: list[DestinationSearchResult] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        result = _normalize_destination_row(row)
        if result is None:
            continue
        key = _normalized_key(result.displayName)
        if key in seen:
            continue
        seen.add(key)
        results.append(result)
        if len(results) >= MAX_DESTINATION_RESULTS:
            break

    return results

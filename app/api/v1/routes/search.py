from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import SessionDep, get_current_user
from app.models.user import User
from app.schemas.search import (
    ExploreDestination,
    ExploreDestinationCreate,
    ExploreDestinationsResult,
    ExploreDestinationUpdate,
    FlightSearchResult,
    InspirationResult,
)
from app.services.explore_destination_service import ExploreDestinationService
from app.services.travel import amadeus_service

router = APIRouter()


@router.get("/flights", response_model=FlightSearchResult)
async def search_flights(
    origin: str = Query(..., min_length=3, max_length=3, description="Origin IATA code, e.g. LHR"),
    destination: str = Query(..., min_length=3, max_length=3, description="Destination IATA code, e.g. NRT"),
    date: str = Query(..., description="Departure date YYYY-MM-DD"),
    adults: int = Query(1, ge=1, le=9),
    _: User = Depends(get_current_user),
):
    """
    Search flight offers via Amadeus **sandbox** (test data, not real bookings).
    Results are cached for 60 s to stay within sandbox rate limits.
    """
    try:
        return await amadeus_service.search_flights(origin, destination, date, adults)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/inspirations", response_model=InspirationResult)
async def get_inspirations(
    origin: str = Query(..., min_length=3, max_length=3, description="Origin IATA code, e.g. MAD"),
    max_price: int | None = Query(None, ge=1, description="Optional max price in USD"),
    _: User = Depends(get_current_user),
):
    """
    Return cheapest reachable destinations from *origin* via Amadeus **sandbox**.
    Useful for "Where can I fly from here?" inspiration on the Explore page.
    """
    try:
        return await amadeus_service.get_inspirations(origin, max_price)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/explore-destinations", response_model=ExploreDestinationsResult)
async def get_explore_destinations(
    db: SessionDep,
    region: str | None = Query(None, description="Optional region filter"),
    include_scores: bool = Query(True, description="Include Teleport score where available"),
    _: User = Depends(get_current_user),
):
    """Return DB-backed Explore destinations, optionally enriched with Teleport scores."""
    service = ExploreDestinationService(db)
    grouped = await service.get_grouped(region=region, include_scores=include_scores)
    return {
        "popular": grouped["popular"],
        "regions": {
            "europe": grouped["europe"],
            "asia": grouped["asia"],
            "americas": grouped["americas"],
            "africa": grouped["africa"],
            "oceania": grouped["oceania"],
        },
    }


@router.post("/explore-destinations", response_model=ExploreDestination, status_code=201)
def create_explore_destination(
    payload: ExploreDestinationCreate,
    db: SessionDep,
    _: User = Depends(get_current_user),
):
    """Create an Explore destination row (authenticated admin-lite endpoint)."""
    row = ExploreDestinationService(db).create(payload)
    return {
        "slug": row.slug,
        "city": row.city,
        "country": row.country,
        "region": row.region,
        "tag": row.tag,
        "description": row.description,
        "sort_order": row.sort_order,
    }


@router.patch("/explore-destinations/{slug}", response_model=ExploreDestination)
def update_explore_destination(
    slug: str,
    payload: ExploreDestinationUpdate,
    db: SessionDep,
    _: User = Depends(get_current_user),
):
    row = ExploreDestinationService(db).update(slug, payload)
    return {
        "slug": row.slug,
        "city": row.city,
        "country": row.country,
        "region": row.region,
        "tag": row.tag,
        "description": row.description,
        "sort_order": row.sort_order,
    }


@router.delete("/explore-destinations/{slug}", status_code=204)
def delete_explore_destination(
    slug: str,
    db: SessionDep,
    _: User = Depends(get_current_user),
):
    ExploreDestinationService(db).delete(slug)
    return None

# Path: app/api/v1/routes/destinations.py
# Summary: Defines destination search API route handlers.

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search import DestinationSearchResult
from app.services.destination_search_service import (
    DestinationSearchProviderError,
    search_destinations,
)

router = APIRouter()


@router.get("/search", response_model=list[DestinationSearchResult])
async def search_destination_places(
    q: str = Query(..., min_length=1, max_length=120),
    _: User = Depends(get_current_user),
):
    try:
        return await search_destinations(q)
    except DestinationSearchProviderError:
        raise HTTPException(
            status_code=503,
            detail="Destination search is temporarily unavailable.",
        )

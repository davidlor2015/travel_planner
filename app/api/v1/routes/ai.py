# Path: app/api/v1/routes/ai.py
# Summary: Defines ai API route handlers.

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.ai import AIApplyRequest, AIPlanRequest, AIRefineRequest, ItineraryResponse
from app.services.ai.itinerary_service import ItineraryService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/plan", response_model=ItineraryResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def generate_trip_plan(
    request: Request,
    body: AIPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Generates a draft itinerary using local AI. Does NOT save to DB."""
    logger.info("AI plan request: trip_id=%s user_id=%s", body.trip_id, current_user.id)
    service = ItineraryService(db)
    try:
        return await service.generate_itinerary(
            trip_id=body.trip_id,
            user_id=current_user.id,
            interests_override=body.interests_override,
            budget_override=body.budget_override,
        )
    except ValueError as e:
        logger.warning("AI plan failed (trip_id=%s): %s", body.trip_id, e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/plan-smart", response_model=ItineraryResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def generate_trip_plan_smart(
    request: Request,
    body: AIPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Generates a draft itinerary using real POI data from OpenTripMap.
    No LLM required. Does NOT save to DB — call /apply to save.
    """
    logger.info("Smart plan request: trip_id=%s user_id=%s", body.trip_id, current_user.id)
    service = ItineraryService(db)
    try:
        return await service.generate_itinerary_rule_based(
            trip_id=body.trip_id,
            user_id=current_user.id,
            interests_override=body.interests_override,
            budget_override=body.budget_override,
        )
    except ValueError as e:
        logger.warning("Smart plan failed (trip_id=%s): %s", body.trip_id, e)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stream/{trip_id}")
@limiter.limit(settings.AI_STREAM_RATE_LIMIT)
async def stream_trip_plan(
    trip_id: int,
    request: Request,
    interests_override: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    Streams an AI-generated itinerary as Server-Sent Events.

    Event types:
      token    — raw LLM text chunk for live display
      complete — validated ItineraryResponse JSON; signals generation is done
      error    — human-readable failure message
    """
    logger.info(
        "Stream plan request: trip_id=%s user_id=%s interests_override=%r",
        trip_id, current_user.id, interests_override,
    )
    service = ItineraryService(db)
    return StreamingResponse(
        service.stream_itinerary(
            trip_id=trip_id,
            user_id=current_user.id,
            interests_override=interests_override,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/apply", status_code=200)
@limiter.limit(settings.AI_RATE_LIMIT)
async def apply_trip_plan(
    request: Request,
    body: AIApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Saves the approved itinerary to the trip record."""
    service = ItineraryService(db)
    try:
        updated_trip = service.apply_itinerary_to_db(
            trip_id=body.trip_id,
            user_id=current_user.id,
            itinerary=body.itinerary,
            source=body.source,
        )
        return {"message": "Itinerary applied successfully", "trip_id": updated_trip.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/trips/{trip_id}/itinerary", response_model=ItineraryResponse)
def get_saved_trip_itinerary(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    service = ItineraryService(db)
    try:
        return service.get_saved_itinerary(trip_id=trip_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/refine", response_model=ItineraryResponse)
@limiter.limit(settings.AI_RATE_LIMIT)
async def refine_trip_plan(
    request: Request,
    body: AIRefineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Refines one day or time block of an existing draft itinerary."""
    if body.regenerate_day_number is None:
        raise HTTPException(status_code=400, detail="regenerate_day_number is required.")

    service = ItineraryService(db)
    try:
        return await service.refine_itinerary(
            trip_id=body.trip_id,
            user_id=current_user.id,
            current_itinerary=body.current_itinerary,
            regenerate_day_number=body.regenerate_day_number,
            regenerate_time_block=body.regenerate_time_block,
            variant=body.variant,
            locked_items=body.locked_items,
            favorite_items=body.favorite_items,
            user_note=body.user_note,
        )
    except ValueError as e:
        logger.warning("AI refine failed (trip_id=%s): %s", body.trip_id, e)
        raise HTTPException(status_code=400, detail=str(e))

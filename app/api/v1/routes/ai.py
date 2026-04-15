import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.ai import AIPlanRequest, ItineraryResponse, AIApplyRequest
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
async def apply_trip_plan(
    request: AIApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Saves the approved itinerary to the trip record."""
    service = ItineraryService(db)
    try:
        updated_trip = service.apply_itinerary_to_db(
            trip_id=request.trip_id,
            user_id=current_user.id,
            itinerary=request.itinerary,
        )
        return {"message": "Itinerary applied successfully", "trip_id": updated_trip.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

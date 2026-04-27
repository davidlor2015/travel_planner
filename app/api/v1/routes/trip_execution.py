# Path: app/api/v1/routes/trip_execution.py
# Summary: Defines trip execution API route handlers.

from fastapi import APIRouter, Request, Response

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.limiter import limiter
from app.schemas.trip import (
    TripExecutionEventResponse,
    TripStopStatusUpdateRequest,
    TripUnplannedStopRequest,
)
from app.services.trip_execution_service import TripExecutionService


router = APIRouter()


@router.post(
    "/{trip_id}/execution/stop-status",
    response_model=TripExecutionEventResponse,
    status_code=201,
)
@limiter.limit(settings.EXECUTION_RATE_LIMIT)
def post_stop_status(
    trip_id: int,
    request: Request,
    payload: TripStopStatusUpdateRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    return TripExecutionService(db).record_stop_status(trip_id, current_user.id, payload)


@router.post(
    "/{trip_id}/execution/unplanned-stop",
    response_model=TripExecutionEventResponse,
    status_code=201,
)
@limiter.limit(settings.EXECUTION_RATE_LIMIT)
def post_unplanned_stop(
    trip_id: int,
    request: Request,
    payload: TripUnplannedStopRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    return TripExecutionService(db).log_unplanned_stop(trip_id, current_user.id, payload)


@router.delete("/{trip_id}/execution/events/{event_id}", status_code=204)
@limiter.limit(settings.EXECUTION_RATE_LIMIT)
def delete_execution_event(
    trip_id: int,
    event_id: int,
    request: Request,
    db: SessionDep,
    current_user: CurrentUser,
):
    TripExecutionService(db).delete_event(trip_id, current_user.id, event_id)
    return Response(status_code=204)

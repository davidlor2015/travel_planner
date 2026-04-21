from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
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
def post_stop_status(
    trip_id: int,
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
def post_unplanned_stop(
    trip_id: int,
    payload: TripUnplannedStopRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    return TripExecutionService(db).log_unplanned_stop(trip_id, current_user.id, payload)


@router.delete("/{trip_id}/execution/events/{event_id}", status_code=204)
def delete_execution_event(
    trip_id: int,
    event_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    TripExecutionService(db).delete_event(trip_id, current_user.id, event_id)
    return Response(status_code=204)

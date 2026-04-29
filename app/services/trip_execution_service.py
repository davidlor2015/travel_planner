# Path: app/services/trip_execution_service.py
# Summary: Implements trip execution service business logic.

from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.trip_execution_event import TripExecutionEvent
from app.repositories.trip_execution_repository import TripExecutionRepository
from app.repositories.itinerary_repository import ItineraryRepository
from app.schemas.trip import (
    TripExecutionEventResponse,
    TripStopStatusUpdateRequest,
    TripUnplannedStopRequest,
)
from app.services.trip_access_service import TripAccessService


class TripExecutionService:
    """
    Write path for on-trip execution events.

    Every action writes a new row to trip_execution_events and is idempotent from
    the caller's perspective: replaying the same POST is safe and simply appends
    another row that happens to be the new latest. The saved itinerary is never
    mutated here.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = TripExecutionRepository(db)
        self.itinerary_repo = ItineraryRepository(db)
        self.access_service = TripAccessService(db)

    def record_stop_status(
        self,
        trip_id: int,
        user_id: int,
        payload: TripStopStatusUpdateRequest,
    ) -> TripExecutionEventResponse:
        self.access_service.require_membership(trip_id, user_id)
        self._require_stop_ref_belongs_to_trip(trip_id=trip_id, stop_ref=payload.stop_ref)
        event = self.repo.record_stop_status(
            trip_id=trip_id,
            user_id=user_id,
            stop_ref=payload.stop_ref,
            status=payload.status,
        )
        return TripExecutionEventResponse.model_validate(event)

    def log_unplanned_stop(
        self,
        trip_id: int,
        user_id: int,
        payload: TripUnplannedStopRequest,
    ) -> TripExecutionEventResponse:
        self.access_service.require_membership(trip_id, user_id)
        event = self.repo.log_unplanned_stop(
            trip_id=trip_id,
            user_id=user_id,
            day_date=payload.day_date,
            title=payload.title,
            time_value=payload.time,
            location=payload.location,
            notes=payload.notes,
            client_request_id=payload.client_request_id,
        )
        return TripExecutionEventResponse.model_validate(event)

    def delete_event(
        self,
        trip_id: int,
        user_id: int,
        event_id: int,
    ) -> None:
        context = self.access_service.require_membership(trip_id, user_id)
        event = self.repo.get_event(event_id)
        if event is None or event.trip_id != trip_id:
            raise HTTPException(status_code=404, detail="Execution event not found")

        is_owner = context.membership.role == "owner"
        is_creator = event.created_by_user_id == user_id
        if not (is_owner or is_creator):
            raise HTTPException(
                status_code=403,
                detail="Only the creator or trip owner can delete this event",
            )
        self.repo.delete_event(event)

    def _require_stop_ref_belongs_to_trip(self, *, trip_id: int, stop_ref: str) -> None:
        """
        Reject stop_refs that do not correspond to a live ItineraryEvent on this trip.

        This prevents clients from writing status against stale IDs after a full
        itinerary republish (save_itinerary deletes and re-inserts, generating
        new IDs). Writes against dead IDs would never surface in a snapshot anyway,
        but rejecting them keeps the log clean.
        """
        try:
            event_id = int(stop_ref)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid stop_ref")

        days = self.itinerary_repo.get_days_by_trip(trip_id)
        for day in days:
            for event in day.events:
                if event.id == event_id:
                    return
        raise HTTPException(status_code=404, detail="Stop not found in saved itinerary")

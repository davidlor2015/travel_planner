from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.trip_execution_event import TripExecutionEvent


class TripExecutionRepository:
    """Append-only persistence for on-trip execution events."""

    STOP_STATUS = "stop_status"
    UNPLANNED_STOP = "unplanned_stop"

    def __init__(self, db: Session):
        self.db = db

    def record_stop_status(
        self,
        *,
        trip_id: int,
        user_id: int,
        stop_ref: str,
        status: str,
    ) -> TripExecutionEvent:
        # Idempotency: if the latest status for this stop_ref already matches,
        # return the existing event instead of appending a duplicate. This keeps
        # the append-only log clean under double-taps and retry-on-transient
        # failures, while still recording every genuine status transition
        # (planned -> confirmed -> planned still produces three distinct rows).
        latest = self.db.scalars(
            select(TripExecutionEvent)
            .where(
                TripExecutionEvent.trip_id == trip_id,
                TripExecutionEvent.kind == self.STOP_STATUS,
                TripExecutionEvent.stop_ref == stop_ref,
                TripExecutionEvent.status.isnot(None),
            )
            .order_by(TripExecutionEvent.id.desc())
            .limit(1)
        ).first()
        if latest is not None and latest.status == status:
            return latest

        event = TripExecutionEvent(
            trip_id=trip_id,
            created_by_user_id=user_id,
            kind=self.STOP_STATUS,
            stop_ref=stop_ref,
            status=status,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def log_unplanned_stop(
        self,
        *,
        trip_id: int,
        user_id: int,
        day_date: date,
        title: str,
        time_value: str | None = None,
        location: str | None = None,
        notes: str | None = None,
        client_request_id: str | None = None,
    ) -> TripExecutionEvent:
        # Idempotent replay: when the client supplies an opaque request id,
        # a second POST carrying the same value must collapse to the original
        # row. This protects against the retry path in `executeWithRetry`
        # duplicating an unplanned stop when the first POST landed but the
        # response was lost on a flaky network. Legacy clients without an id
        # fall through to the plain insert.
        if client_request_id:
            existing = self._find_by_client_request_id(trip_id, client_request_id)
            if existing is not None:
                return existing

        event = TripExecutionEvent(
            trip_id=trip_id,
            created_by_user_id=user_id,
            kind=self.UNPLANNED_STOP,
            day_date=day_date,
            title=title,
            time=time_value,
            location=location,
            notes=notes,
            client_request_id=client_request_id,
        )
        self.db.add(event)
        try:
            self.db.commit()
        except IntegrityError:
            # Race with a concurrent retry of the same request id — the
            # partial unique index did its job. Re-read and return the row
            # the other request committed so both callers see the same event.
            self.db.rollback()
            if client_request_id:
                existing = self._find_by_client_request_id(trip_id, client_request_id)
                if existing is not None:
                    return existing
            raise
        self.db.refresh(event)
        return event

    def _find_by_client_request_id(
        self, trip_id: int, client_request_id: str
    ) -> TripExecutionEvent | None:
        return self.db.scalars(
            select(TripExecutionEvent)
            .where(
                TripExecutionEvent.trip_id == trip_id,
                TripExecutionEvent.kind == self.UNPLANNED_STOP,
                TripExecutionEvent.client_request_id == client_request_id,
            )
            .limit(1)
        ).first()

    def get_event(self, event_id: int) -> TripExecutionEvent | None:
        return self.db.get(TripExecutionEvent, event_id)

    def delete_event(self, event: TripExecutionEvent) -> None:
        self.db.delete(event)
        self.db.commit()

    def latest_stop_statuses(self, trip_id: int) -> dict[str, str]:
        """
        Return a mapping of stop_ref -> latest non-null status for the trip.

        Implemented as a correlated-subquery filter instead of DISTINCT ON so
        that both Postgres (production) and SQLite (tests) work identically.
        """
        latest_id_subq = (
            select(func.max(TripExecutionEvent.id))
            .where(
                TripExecutionEvent.trip_id == trip_id,
                TripExecutionEvent.kind == self.STOP_STATUS,
                TripExecutionEvent.stop_ref.isnot(None),
            )
            .group_by(TripExecutionEvent.stop_ref)
            .scalar_subquery()
        )

        rows = self.db.execute(
            select(TripExecutionEvent.stop_ref, TripExecutionEvent.status).where(
                TripExecutionEvent.id.in_(latest_id_subq)
            )
        ).all()

        return {row.stop_ref: row.status for row in rows if row.stop_ref and row.status}

    def unplanned_stops_for_date(
        self, trip_id: int, day_date: date
    ) -> list[TripExecutionEvent]:
        return list(
            self.db.scalars(
                select(TripExecutionEvent)
                .where(
                    TripExecutionEvent.trip_id == trip_id,
                    TripExecutionEvent.kind == self.UNPLANNED_STOP,
                    TripExecutionEvent.day_date == day_date,
                )
                .order_by(TripExecutionEvent.time.is_(None), TripExecutionEvent.time, TripExecutionEvent.created_at)
            ).all()
        )

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class TripExecutionEvent(Base):
    """
    Append-only log of what actually happened during a trip.

    Rows in this table are never edited. Latest event per (trip_id, stop_ref) wins
    when merging onto the saved itinerary. The saved itinerary remains the plan;
    this table records the execution trail.

    Two kinds:
    - stop_status: marks an existing planned stop as confirmed/skipped/planned.
      stop_ref stores the ItineraryEvent.id the status applies to.
    - unplanned_stop: an ad-hoc stop logged on-trip that was never in the plan.
      stop_ref is null; day_date/title/location/time/notes describe the stop.
    """

    __tablename__ = "trip_execution_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    stop_ref: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    day_date: Mapped[object | None] = mapped_column(Date, nullable=True)
    time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    trip = relationship("Trip")
    created_by = relationship("User")

from typing import List

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.itinerary import ItineraryDay, ItineraryDayAnchor, ItineraryEvent
from app.models.trip_membership import TripMembership
from app.models.user import User
from app.schemas.ai import DayAnchor, DayPlan, ItineraryItem, ItineraryResponse


class ItineraryRepository:
    """Handles all DB reads/writes for itinerary days and events."""

    def __init__(self, db: Session):
        self.db = db

    def save_itinerary(self, trip_id: int, itinerary: ItineraryResponse) -> List[ItineraryDay]:
        """
        Atomically replace all itinerary days/events for a trip.

        Deletes existing rows first, then bulk-inserts the new structure.
        Uses flush() to obtain PKs for child rows without an intermediate commit,
        so the entire operation lands in one transaction.

        Events are deleted explicitly before days because bulk DELETE bypasses
        SQLAlchemy's ORM cascade, and SQLite does not enforce FK CASCADE by
        default (unlike MySQL).  Explicit ordering keeps the repository portable.
        """
        existing_day_ids = select(ItineraryDay.id).where(ItineraryDay.trip_id == trip_id)
        self.db.execute(
            delete(ItineraryDayAnchor).where(ItineraryDayAnchor.day_id.in_(existing_day_ids))
        )
        self.db.execute(delete(ItineraryEvent).where(ItineraryEvent.day_id.in_(existing_day_ids)))
        self.db.execute(delete(ItineraryDay).where(ItineraryDay.trip_id == trip_id))
        ownership_to_user_id = self._membership_owner_lookup(trip_id)

        saved_days: List[ItineraryDay] = []
        for day_plan in itinerary.days:
            day = ItineraryDay(
                trip_id=trip_id,
                day_number=day_plan.day_number,
                day_date=day_plan.date,
                day_title=day_plan.day_title,
                day_note=day_plan.day_note,
            )
            self.db.add(day)
            self.db.flush()  # Populate day.id so child events can reference it.

            for order, item in enumerate(day_plan.items):
                handled_by_user_id, handled_by_legacy = self._resolve_owner(
                    ownership_to_user_id,
                    item.handled_by,
                )
                booked_by_user_id, booked_by_legacy = self._resolve_owner(
                    ownership_to_user_id,
                    item.booked_by,
                )
                self.db.add(
                    ItineraryEvent(
                        day_id=day.id,
                        sort_order=order,
                        time=item.time,
                        title=item.title,
                        location=item.location,
                        lat=item.lat,
                        lon=item.lon,
                        notes=item.notes,
                        cost_estimate=item.cost_estimate,
                        status=item.status,
                        handled_by_user_id=handled_by_user_id,
                        booked_by_user_id=booked_by_user_id,
                        handled_by_legacy=handled_by_legacy,
                        booked_by_legacy=booked_by_legacy,
                    )
                )

            for order, anchor in enumerate(day_plan.anchors):
                handled_by_user_id, handled_by_legacy = self._resolve_owner(
                    ownership_to_user_id,
                    anchor.handled_by,
                )
                booked_by_user_id, booked_by_legacy = self._resolve_owner(
                    ownership_to_user_id,
                    anchor.booked_by,
                )
                self.db.add(
                    ItineraryDayAnchor(
                        day_id=day.id,
                        sort_order=order,
                        anchor_type=anchor.type,
                        label=anchor.label,
                        time=anchor.time,
                        note=anchor.note,
                        handled_by_user_id=handled_by_user_id,
                        booked_by_user_id=booked_by_user_id,
                        handled_by_legacy=handled_by_legacy,
                        booked_by_legacy=booked_by_legacy,
                    )
                )

            saved_days.append(day)

        self.db.commit()
        for day in saved_days:
            self.db.refresh(day)
        return saved_days

    def get_days_by_trip(self, trip_id: int) -> List[ItineraryDay]:
        """Return all days for a trip ordered by day_number with events and anchors."""
        return list(
            self.db.scalars(
                select(ItineraryDay)
                .options(
                    selectinload(ItineraryDay.events),
                    selectinload(ItineraryDay.anchors),
                )
                .where(ItineraryDay.trip_id == trip_id)
                .order_by(ItineraryDay.day_number)
            ).all()
        )

    def to_itinerary_response(
        self,
        trip_id: int,
        title: str,
        summary: str,
        source: str = "saved_itinerary",
        source_label: str = "Saved itinerary",
        fallback_used: bool = False,
    ) -> ItineraryResponse | None:
        days = self.get_days_by_trip(trip_id)
        if len(days) == 0:
            return None

        owner_email_by_user_id = self._member_email_lookup(trip_id)
        response_days: list[DayPlan] = []
        for day in days:
            items: list[ItineraryItem] = []
            for event in day.events:
                items.append(
                    ItineraryItem(
                        time=event.time,
                        title=event.title,
                        location=event.location,
                        lat=event.lat,
                        lon=event.lon,
                        notes=event.notes,
                        cost_estimate=event.cost_estimate,
                        status=self._normalize_status(event.status),
                        handled_by=self._owner_value(
                            event.handled_by_user_id,
                            event.handled_by_legacy,
                            owner_email_by_user_id,
                        ),
                        booked_by=self._owner_value(
                            event.booked_by_user_id,
                            event.booked_by_legacy,
                            owner_email_by_user_id,
                        ),
                    )
                )
            anchors: list[DayAnchor] = []
            for anchor in day.anchors:
                anchor_type = self._normalize_anchor_type(anchor.anchor_type)
                if anchor_type is None:
                    continue
                anchors.append(
                    DayAnchor(
                        type=anchor_type,
                        label=anchor.label,
                        time=anchor.time,
                        note=anchor.note,
                        handled_by=self._owner_value(
                            anchor.handled_by_user_id,
                            anchor.handled_by_legacy,
                            owner_email_by_user_id,
                        ),
                        booked_by=self._owner_value(
                            anchor.booked_by_user_id,
                            anchor.booked_by_legacy,
                            owner_email_by_user_id,
                        ),
                    )
                )
            response_days.append(
                DayPlan(
                    day_number=day.day_number,
                    date=day.day_date,
                    day_title=day.day_title,
                    day_note=day.day_note,
                    anchors=anchors,
                    items=items,
                )
            )

        return ItineraryResponse(
            title=title,
            summary=summary,
            days=response_days,
            budget_breakdown=None,
            packing_list=None,
            tips=None,
            source=source,
            source_label=source_label,
            fallback_used=fallback_used,
        )

    def _membership_owner_lookup(self, trip_id: int) -> dict[str, int]:
        rows = self.db.execute(
            select(User.id, User.email)
            .join(TripMembership, TripMembership.user_id == User.id)
            .where(TripMembership.trip_id == trip_id)
        ).all()
        mapping: dict[str, int] = {}
        for row in rows:
            email = self._normalize_owner_value(row.email)
            if email:
                mapping[email] = row.id
        return mapping

    def _member_email_lookup(self, trip_id: int) -> dict[int, str]:
        rows = self.db.execute(
            select(User.id, User.email)
            .join(TripMembership, TripMembership.user_id == User.id)
            .where(TripMembership.trip_id == trip_id)
        ).all()
        return {
            int(row.id): row.email
            for row in rows
            if isinstance(row.id, int) and isinstance(row.email, str)
        }

    def _resolve_owner(
        self,
        ownership_to_user_id: dict[str, int],
        owner_value: str | None,
    ) -> tuple[int | None, str | None]:
        normalized = self._normalize_owner_value(owner_value)
        if not normalized:
            return None, None
        mapped_user_id = ownership_to_user_id.get(normalized)
        if mapped_user_id is not None:
            return mapped_user_id, None
        return None, owner_value.strip() if owner_value else None

    def _owner_value(
        self,
        owner_user_id: int | None,
        owner_legacy: str | None,
        owner_email_by_user_id: dict[int, str],
    ) -> str | None:
        if owner_user_id is not None:
            return owner_email_by_user_id.get(owner_user_id) or owner_legacy
        return owner_legacy

    def _normalize_owner_value(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized if normalized else None

    def _normalize_status(self, value: str | None) -> str | None:
        if value in {"planned", "confirmed", "skipped"}:
            return value
        return None

    def _normalize_anchor_type(self, value: str | None) -> str | None:
        if value in {"flight", "hotel_checkin"}:
            return value
        return None

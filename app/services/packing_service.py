# Path: app/services/packing_service.py
# Summary: Implements packing service business logic.

from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.packing_item import PackingItem
from app.models.reservation import Reservation
from app.schemas.packing import (
    PackingItemCreate,
    PackingItemResponse,
    PackingItemUpdate,
    PackingSuggestionResponse,
)
from app.services.trip_access_service import TripAccessService


def _is_southern_hemisphere(destination: str) -> bool:
    dest = destination.lower()
    southern_markers = (
        "australia",
        "new zealand",
        "cape town",
        "south africa",
        "argentina",
        "chile",
        "peru",
        "brazil",
    )
    return any(marker in dest for marker in southern_markers)


def _season_suggestions(destination: str, start_date: date | None) -> list[tuple[str, str]]:
    month = start_date.month if start_date else date.today().month
    if _is_southern_hemisphere(destination):
        month = ((month + 5) % 12) + 1

    if month in (12, 1, 2):
        return [
            ("Warm layers", "Cool-season trips are easier when you can add or shed layers."),
            ("Weather-resistant jacket", "Useful for colder or wetter travel days."),
        ]
    if month in (6, 7, 8):
        return [
            ("Lightweight clothes", "Warm-season travel is easier with breathable outfits."),
            ("Sunscreen", "High-UV days sneak up fast during summer travel."),
        ]
    return [
        ("Comfortable walking shoes", "Shoulder-season trips still tend to involve long walking days."),
    ]


def _reservation_suggestions(reservations: list[Reservation]) -> list[tuple[str, str]]:
    types = {reservation.reservation_type for reservation in reservations}
    suggestions: list[tuple[str, str]] = []
    if "flight" in types:
        suggestions.append(("Passport", "Bring your passport for airport check-in and arrival formalities."))
        suggestions.append(("Portable charger", "Long airport and transit days go smoother with backup power."))
    if "hotel" in types:
        suggestions.append(("Hotel confirmation copy", "Useful if you lose signal at check-in."))
    if {"train", "bus"} & types:
        suggestions.append(("Offline tickets", "Rail and bus trips are easier when tickets are saved offline."))
    if "car" in types:
        suggestions.append(("Driver's license", "Keep it handy for pickup and any driving checks."))
    if "activity" in types:
        suggestions.append(("Activity tickets", "Having confirmations ready avoids day-of scrambling."))
    if "restaurant" in types:
        suggestions.append(("Reservation details", "Helpful for timed dining bookings and special requests."))
    return suggestions


def _destination_suggestions(destination: str) -> list[tuple[str, str]]:
    dest = destination.lower()
    suggestions: list[tuple[str, str]] = []
    if any(keyword in dest for keyword in ("tokyo", "japan", "europe", "france", "italy", "spain")):
        suggestions.append(("Travel adapter", "A plug adapter is one of the easiest things to forget abroad."))
    if any(keyword in dest for keyword in ("beach", "hawaii", "miami", "bali", "phuket")):
        suggestions.append(("Swimwear", "Beach destinations are better when this is packed early."))
    return suggestions


class PackingService:
    def __init__(self, db: Session):
        self.db = db
        self.access_service = TripAccessService(db)

    def _get_item(self, trip_id: int, user_id: int, item_id: int) -> PackingItem:
        context = self.access_service.require_membership(trip_id, user_id)
        item = self.db.get(PackingItem, item_id)
        if item is None or item.member_state_id != context.member_state.id:
            raise HTTPException(status_code=404, detail="Packing item not found")
        return item

    def list_items(self, trip_id: int, user_id: int) -> list[PackingItemResponse]:
        context = self.access_service.require_membership(trip_id, user_id)
        items = (
            self.db.query(PackingItem)
            .filter(PackingItem.member_state_id == context.member_state.id)
            .all()
        )
        return [PackingItemResponse.model_validate(item) for item in items]

    def list_suggestions(self, trip_id: int, user_id: int) -> list[PackingSuggestionResponse]:
        context = self.access_service.require_membership(trip_id, user_id)
        existing_labels = {
            item.label.strip().lower()
            for item in context.member_state.packing_items
        }
        reservations = (
            self.db.query(Reservation)
            .filter(Reservation.trip_id == context.trip.id)
            .all()
        )
        raw_suggestions = [
            *_season_suggestions(context.trip.destination, context.trip.start_date),
            *_destination_suggestions(context.trip.destination),
            *_reservation_suggestions(reservations),
        ]

        seen: set[str] = set()
        suggestions: list[PackingSuggestionResponse] = []
        for label, reason in raw_suggestions:
            normalized = label.strip().lower()
            if normalized in existing_labels or normalized in seen:
                continue
            seen.add(normalized)
            suggestions.append(PackingSuggestionResponse(label=label, reason=reason))
            if len(suggestions) == 6:
                break
        return suggestions

    def create_item(self, trip_id: int, user_id: int, item_in: PackingItemCreate) -> PackingItemResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        item = PackingItem(member_state_id=context.member_state.id, label=item_in.label)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return PackingItemResponse.model_validate(item)

    def update_item(
        self,
        trip_id: int,
        user_id: int,
        item_id: int,
        item_in: PackingItemUpdate,
    ) -> PackingItemResponse:
        item = self._get_item(trip_id, user_id, item_id)
        if item_in.label is not None:
            item.label = item_in.label
        if item_in.checked is not None:
            item.checked = item_in.checked
        self.db.commit()
        self.db.refresh(item)
        return PackingItemResponse.model_validate(item)

    def delete_item(self, trip_id: int, user_id: int, item_id: int) -> None:
        item = self._get_item(trip_id, user_id, item_id)
        self.db.delete(item)
        self.db.commit()

from typing import List
from datetime import date

from fastapi import APIRouter, HTTPException, Response

from app.api.deps import CurrentUser, SessionDep
from app.models.reservation import Reservation
from app.models.packing_item import PackingItem
from app.models.trip import Trip
from app.schemas.packing import (
    PackingItemCreate,
    PackingItemUpdate,
    PackingItemResponse,
    PackingSuggestionResponse,
)

router = APIRouter()


def _get_trip(trip_id: int, user_id: int, db: SessionDep) -> Trip:
    trip = db.get(Trip, trip_id)
    if not trip or trip.user_id != user_id:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


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


def _season_suggestions(trip: Trip) -> list[tuple[str, str]]:
    month = trip.start_date.month if trip.start_date else date.today().month
    southern = _is_southern_hemisphere(trip.destination)
    if southern:
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


@router.get("/", response_model=List[PackingItemResponse])
def list_packing_items(trip_id: int, db: SessionDep, current_user: CurrentUser):
    _get_trip(trip_id, current_user.id, db)
    return db.query(PackingItem).filter(PackingItem.trip_id == trip_id).all()


@router.get("/suggestions", response_model=List[PackingSuggestionResponse])
def list_packing_suggestions(trip_id: int, db: SessionDep, current_user: CurrentUser):
    trip = _get_trip(trip_id, current_user.id, db)
    existing_labels = {
        item.label.strip().lower()
        for item in db.query(PackingItem).filter(PackingItem.trip_id == trip_id).all()
    }
    reservations = db.query(Reservation).filter(Reservation.trip_id == trip_id).all()

    raw_suggestions = [
        *_season_suggestions(trip),
        *_destination_suggestions(trip.destination),
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


@router.post("/", response_model=PackingItemResponse, status_code=201)
def create_packing_item(
    trip_id: int, item_in: PackingItemCreate, db: SessionDep, current_user: CurrentUser
):
    _get_trip(trip_id, current_user.id, db)
    item = PackingItem(trip_id=trip_id, label=item_in.label)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=PackingItemResponse)
def update_packing_item(
    trip_id: int,
    item_id: int,
    item_in: PackingItemUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    item = db.get(PackingItem, item_id)
    if not item or item.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Packing item not found")
    if item_in.label is not None:
        item.label = item_in.label
    if item_in.checked is not None:
        item.checked = item_in.checked
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_packing_item(
    trip_id: int, item_id: int, db: SessionDep, current_user: CurrentUser
):
    _get_trip(trip_id, current_user.id, db)
    item = db.get(PackingItem, item_id)
    if not item or item.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Packing item not found")
    db.delete(item)
    db.commit()
    return Response(status_code=204)

from datetime import date, datetime, timezone

from app.models.packing_item import PackingItem
from app.models.reservation import Reservation
from app.models.trip import Trip


def _create_trip(db, user_id: int, destination: str = "Tokyo, Japan") -> Trip:
    trip = Trip(
        user_id=user_id,
        title="Tokyo Spring",
        destination=destination,
        description=None,
        notes=None,
        start_date=date(2026, 4, 17),
        end_date=date(2026, 4, 19),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_packing_suggestions_use_destination_and_reservations(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)
    db.add(
        Reservation(
            trip_id=trip.id,
            title="ANA Flight",
            reservation_type="flight",
            start_at=datetime(2026, 4, 17, 9, 15, tzinfo=timezone.utc),
        )
    )
    db.commit()

    res = client.get(f"/v1/trips/{trip.id}/packing/suggestions", headers=auth_headers_user_a)
    assert res.status_code == 200, res.text
    labels = [item["label"] for item in res.json()]
    assert "Passport" in labels
    assert "Travel adapter" in labels


def test_packing_suggestions_filter_existing_items(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)
    db.add(PackingItem(trip_id=trip.id, label="Passport"))
    db.add(
        Reservation(
            trip_id=trip.id,
            title="ANA Flight",
            reservation_type="flight",
            start_at=datetime(2026, 4, 17, 9, 15, tzinfo=timezone.utc),
        )
    )
    db.commit()

    res = client.get(f"/v1/trips/{trip.id}/packing/suggestions", headers=auth_headers_user_a)
    assert res.status_code == 200, res.text
    labels = [item["label"] for item in res.json()]
    assert "Passport" not in labels

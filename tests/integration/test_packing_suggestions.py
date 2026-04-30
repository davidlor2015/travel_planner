from datetime import date, datetime, timezone

from app.models.packing_item import PackingItem
from app.models.reservation import Reservation
from app.models.trip import Trip
from app.models.trip_membership import TripMemberState, TripMembership


def _create_trip(db, user_id: int, attach_trip_membership, destination: str = "Tokyo, Japan") -> Trip:
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
    attach_trip_membership(trip, user_id)
    return trip


def test_packing_suggestions_use_destination_and_reservations(client, db, user_a, auth_headers_user_a, attach_trip_membership):
    trip = _create_trip(db, user_a.id, attach_trip_membership)
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
    assert all(set(item.keys()) == {"label", "reason"} for item in res.json())


def test_packing_suggestions_filter_existing_items(client, db, user_a, auth_headers_user_a, attach_trip_membership):
    trip = _create_trip(db, user_a.id, attach_trip_membership)
    state = (
        db.query(TripMemberState)
        .join(TripMembership, TripMembership.id == TripMemberState.membership_id)
        .filter(TripMembership.trip_id == trip.id, TripMembership.user_id == user_a.id)
        .one()
    )
    db.add(PackingItem(member_state_id=state.id, label="Passport"))
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

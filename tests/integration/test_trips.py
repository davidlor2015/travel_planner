"""
Trip CRUD integration tests.

1. Authentication is required
2. Users can create trips
3. Users only see their own trips
4. Users cannot access others' trips (404)
5. Updates only provided fields (partial PATCH)
6. Delete removes the trip
"""
from datetime import date, datetime, time, timedelta, timezone

from app.models.budget_expense import BudgetExpense
from app.models.itinerary import ItineraryDay, ItineraryEvent
from app.models.packing_item import PackingItem
from app.models.prep_item import PrepItem
from app.models.reservation import Reservation
from app.models.trip import Trip
from app.models.trip_execution_event import TripExecutionEvent
from app.models.trip_invite import TripInvite
from app.models.trip_membership import TripMembership


def test_requires_auth(client):
    res = client.get("/v1/trips/")
    assert res.status_code == 401


def test_create_trip(client, auth_headers_user_a):
    payload = {
        "title": "Disneyland Trip",
        "destination": "Tokyo",
        "description": "sushi + anime",
        "start_date": "2026-02-25",
        "end_date": "2026-03-05",
        "notes": "Book hotel early",
    }

    res = client.post("/v1/trips/", json=payload, headers=auth_headers_user_a)
    assert res.status_code == 201, res.text

    data = res.json()
    assert data["id"] > 0
    assert data["title"] == "Disneyland Trip"
    assert data["destination"] == "Tokyo"
    assert "user_id" in data
    assert "created_at" in data


def test_create_trip_normalizes_destination_spacing(client, auth_headers_user_a):
    payload = {
        "title": "City Break",
        "destination": "  Lisbon   ,   Portugal  ",
        "description": None,
        "start_date": "2026-02-25",
        "end_date": "2026-03-05",
        "notes": None,
    }

    res = client.post("/v1/trips/", json=payload, headers=auth_headers_user_a)
    assert res.status_code == 201, res.text
    assert res.json()["destination"] == "Lisbon, Portugal"


def test_read_trips_only_returns_current_users_trips(client, db, user_a, user_b, auth_headers_user_a, attach_trip_membership):
    t1 = Trip(
        user_id=user_a.id,
        title="A Trip",
        destination="Paris",
        description=None,
        notes=None,
        start_date=date(2026, 3, 1),
        end_date=date(2026, 4, 1),
    )
    t2 = Trip(
        user_id=user_b.id,
        title="B Trip",
        destination="United Kingdom",
        description=None,
        notes=None,
        start_date=date(2026, 5, 6),
        end_date=date(2026, 6, 3),
    )

    db.add_all([t1, t2])
    db.commit()
    attach_trip_membership(t1, user_a.id)
    attach_trip_membership(t2, user_b.id)

    res = client.get("/v1/trips/", headers=auth_headers_user_a)
    assert res.status_code == 200, res.text

    trips = res.json()
    assert len(trips) == 1
    assert trips[0]["title"] == "A Trip"
    assert trips[0]["destination"] == "Paris"


def test_read_trips_and_detail_response_contract(client, db, user_a, auth_headers_user_a, attach_trip_membership):
    trip = Trip(
        user_id=user_a.id,
        title="Contract Trip",
        destination="Seoul",
        description="Trip contract test",
        notes="notes",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 5),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    attach_trip_membership(trip, user_a.id)

    list_res = client.get("/v1/trips/", headers=auth_headers_user_a)
    assert list_res.status_code == 200, list_res.text
    rows = list_res.json()
    assert len(rows) == 1
    row = rows[0]
    assert set(row.keys()) == {
        "id",
        "user_id",
        "title",
        "destination",
        "description",
        "start_date",
        "end_date",
        "notes",
        "created_at",
        "member_count",
        "members",
        "pending_invites",
    }
    assert len(row["members"]) == 1
    assert set(row["members"][0].keys()) == {
        "user_id",
        "email",
        "role",
        "joined_at",
        "status",
        "workspace_last_seen_signature",
        "workspace_last_seen_snapshot",
        "workspace_last_seen_at",
    }

    detail_res = client.get(f"/v1/trips/{trip.id}", headers=auth_headers_user_a)
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()
    assert set(detail.keys()) == set(row.keys())
    assert detail["id"] == trip.id
    assert detail["title"] == "Contract Trip"


def test_read_trips_lite_returns_lean_payload(client, db, user_a, auth_headers_user_a, attach_trip_membership):
    trip = Trip(
        user_id=user_a.id,
        title="Lite Trip",
        destination="Berlin",
        description="full details exist but are not needed in list-lite",
        notes="notes",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 10),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    attach_trip_membership(trip, user_a.id)

    res = client.get("/v1/trips/lite", headers=auth_headers_user_a)
    assert res.status_code == 200, res.text
    rows = res.json()
    assert len(rows) == 1
    row = rows[0]
    assert set(row.keys()) == {
        "id",
        "user_id",
        "title",
        "destination",
        "start_date",
        "end_date",
        "created_at",
        "member_count",
    }
    assert row["title"] == "Lite Trip"
    assert row["destination"] == "Berlin"


def test_trip_summaries_upcoming_count_includes_later_today_excludes_before_today(
    client,
    db,
    user_a,
    auth_headers_user_a,
    attach_trip_membership,
):
    today = date.today()
    trip = Trip(
        user_id=user_a.id,
        title="Summary Trip",
        destination="Madrid",
        description=None,
        notes=None,
        start_date=today,
        end_date=today + timedelta(days=3),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    attach_trip_membership(trip, user_a.id)

    before_today = datetime.combine(today, time.min, tzinfo=timezone.utc) - timedelta(minutes=1)
    later_today = datetime.combine(today, time.min, tzinfo=timezone.utc) + timedelta(hours=12)

    for title, start_at in (
        ("Past boundary", before_today),
        ("Later today", later_today),
    ):
        create_res = client.post(
            f"/v1/trips/{trip.id}/reservations/",
            json={
                "title": title,
                "reservation_type": "other",
                "start_at": start_at.isoformat().replace("+00:00", "Z"),
            },
            headers=auth_headers_user_a,
        )
        assert create_res.status_code == 201, create_res.text

    summaries_res = client.get("/v1/trips/summaries", headers=auth_headers_user_a)
    assert summaries_res.status_code == 200, summaries_res.text
    summaries = summaries_res.json()
    summary = [row for row in summaries if row["trip_id"] == trip.id][0]
    assert summary["reservation_count"] == 2
    assert summary["reservation_upcoming_count"] == 1


def test_read_trip_returns_404_if_not_owned(client, db, user_b, auth_headers_user_a, attach_trip_membership):
    t = Trip(
        user_id=user_b.id,
        title="Secret Trip",
        destination="Rome",
        description=None,
        notes=None,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 2),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    attach_trip_membership(t, user_b.id)

    res = client.get(f"/v1/trips/{t.id}", headers=auth_headers_user_a)
    assert res.status_code == 404
    assert res.json()["detail"] == "Trip not found"


def test_update_trip_partial(client, auth_headers_user_a):
    create_payload = {
        "title": "Someone's Trip",
        "destination": "SF",
        "description": None,
        "start_date": "2026-02-25",
        "end_date": "2026-03-05",
        "notes": None,
    }

    create_res = client.post("/v1/trips/", json=create_payload, headers=auth_headers_user_a)
    assert create_res.status_code == 201, create_res.text

    trip_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/v1/trips/{trip_id}",
        json={"title": "Updated Trip", "notes": "A note"},
        headers=auth_headers_user_a,
    )

    assert patch_res.status_code == 200, patch_res.text

    data = patch_res.json()
    assert data["title"] == "Updated Trip"
    assert data["notes"] == "A note"
    assert data["destination"] == "SF"


def test_delete_trip_204(client, auth_headers_user_a):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Delete me",
            "destination": "NYC",
            "description": None,
            "start_date": "2026-02-25",
            "end_date": "2026-03-05",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text

    trip_id = create_res.json()["id"]

    del_res = client.delete(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert del_res.status_code == 204

    get_res = client.get(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert get_res.status_code == 404

    list_res = client.get("/v1/trips/", headers=auth_headers_user_a)
    assert list_res.status_code == 200
    assert all(trip["id"] != trip_id for trip in list_res.json())


def test_member_cannot_delete_trip(client, user_b, auth_headers_user_a, auth_headers_user_b):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Shared keep",
            "destination": "Lisbon",
            "description": None,
            "start_date": "2026-06-10",
            "end_date": "2026-06-15",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    add_member_res = client.post(
        f"/v1/trips/{trip_id}/members",
        json={"email": user_b.email},
        headers=auth_headers_user_a,
    )
    assert add_member_res.status_code == 201, add_member_res.text

    del_res = client.delete(f"/v1/trips/{trip_id}", headers=auth_headers_user_b)
    assert del_res.status_code == 403

    owner_get_res = client.get(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert owner_get_res.status_code == 200


def test_non_member_cannot_delete_trip(client, auth_headers_user_a, auth_headers_user_b):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Private keep",
            "destination": "Kyoto",
            "description": None,
            "start_date": "2026-09-10",
            "end_date": "2026-09-15",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    del_res = client.delete(f"/v1/trips/{trip_id}", headers=auth_headers_user_b)
    assert del_res.status_code == 404

    owner_get_res = client.get(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert owner_get_res.status_code == 200


def test_delete_trip_removes_related_workspace_data(client, db, user_a, auth_headers_user_a):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Full cleanup",
            "destination": "Rome",
            "description": None,
            "start_date": "2026-10-10",
            "end_date": "2026-10-15",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    membership = (
        db.query(TripMembership)
        .filter(TripMembership.trip_id == trip_id, TripMembership.user_id == user_a.id)
        .one()
    )
    state = membership.member_state
    state_id = state.id

    day = ItineraryDay(trip_id=trip_id, day_number=1, day_date="2026-10-10")
    db.add(day)
    db.flush()
    db.add(ItineraryEvent(day_id=day.id, sort_order=1, title="Arrival"))
    reservation = Reservation(
        trip_id=trip_id,
        title="Hotel",
        reservation_type="hotel",
        start_at=datetime(2026, 10, 10, tzinfo=timezone.utc),
    )
    db.add(reservation)
    db.flush()
    db.add(PackingItem(member_state_id=state.id, label="Passport"))
    db.add(
        BudgetExpense(
            member_state_id=state.id,
            reservation_id=reservation.id,
            label="Hotel",
            amount=200,
            category="lodging",
        )
    )
    db.add(PrepItem(member_state_id=state.id, title="Check visa", prep_type="document"))
    db.add(
        TripInvite(
            trip_id=trip_id,
            email="guest@example.com",
            invited_by_user_id=user_a.id,
            token_hash="cleanup-token",
            expires_at=datetime(2026, 10, 1, tzinfo=timezone.utc),
        )
    )
    db.add(
        TripExecutionEvent(
            trip_id=trip_id,
            created_by_user_id=user_a.id,
            kind="unplanned_stop",
            title="Coffee",
        )
    )
    db.commit()

    del_res = client.delete(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert del_res.status_code == 204, del_res.text

    assert db.query(Trip).filter(Trip.id == trip_id).count() == 0
    assert db.query(ItineraryDay).filter(ItineraryDay.trip_id == trip_id).count() == 0
    assert db.query(Reservation).filter(Reservation.trip_id == trip_id).count() == 0
    assert db.query(TripInvite).filter(TripInvite.trip_id == trip_id).count() == 0
    assert db.query(TripExecutionEvent).filter(TripExecutionEvent.trip_id == trip_id).count() == 0
    assert db.query(TripMembership).filter(TripMembership.trip_id == trip_id).count() == 0
    assert db.query(PackingItem).filter(PackingItem.member_state_id == state_id).count() == 0
    assert db.query(BudgetExpense).filter(BudgetExpense.member_state_id == state_id).count() == 0
    assert db.query(PrepItem).filter(PrepItem.member_state_id == state_id).count() == 0

    list_res = client.get("/v1/trips/", headers=auth_headers_user_a)
    assert list_res.status_code == 200
    assert all(trip["id"] != trip_id for trip in list_res.json())


def test_owner_can_add_member_by_email(
    client,
    auth_headers_user_a,
    user_b,
):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Shared Trip",
            "destination": "Lisbon",
            "description": None,
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    trip_id = create_res.json()["id"]

    add_member_res = client.post(
        f"/v1/trips/{trip_id}/members",
        json={"email": user_b.email},
        headers=auth_headers_user_a,
    )

    assert add_member_res.status_code == 201, add_member_res.text
    assert add_member_res.json()["email"] == user_b.email

    trip_res = client.get(f"/v1/trips/{trip_id}", headers=auth_headers_user_a)
    assert trip_res.status_code == 200
    assert {member["email"] for member in trip_res.json()["members"]} == {
        "usera@example.com",
        "userb@example.com",
    }


def test_added_member_can_read_shared_trip(client, user_b, auth_headers_user_a, auth_headers_user_b):
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Shared Rome",
            "destination": "Rome",
            "description": None,
            "start_date": "2026-09-01",
            "end_date": "2026-09-04",
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    trip_id = create_res.json()["id"]

    add_member_res = client.post(
        f"/v1/trips/{trip_id}/members",
        json={"email": user_b.email},
        headers=auth_headers_user_a,
    )
    assert add_member_res.status_code == 201, add_member_res.text

    trip_res = client.get(f"/v1/trips/{trip_id}", headers=auth_headers_user_b)
    assert trip_res.status_code == 200
    assert trip_res.json()["destination"] == "Rome"

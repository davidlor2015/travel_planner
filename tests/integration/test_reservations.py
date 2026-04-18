from datetime import date

from app.models.trip import Trip


def _create_trip(db, user_id: int) -> Trip:
    trip = Trip(
        user_id=user_id,
        title="Tokyo Spring",
        destination="Tokyo, Japan",
        description=None,
        notes=None,
        start_date=date(2026, 4, 17),
        end_date=date(2026, 4, 19),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_create_and_list_reservations(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)

    create_res = client.post(
        f"/v1/trips/{trip.id}/reservations/",
        json={
            "title": "ANA Flight to Tokyo",
            "reservation_type": "flight",
            "provider": "ANA",
            "confirmation_code": "ZX81PQ",
            "start_at": "2026-04-17T09:15:00Z",
            "end_at": "2026-04-17T13:05:00Z",
            "location": "SFO Terminal 2",
            "notes": "Window seat requested",
            "amount": 642.50,
            "currency": "usd",
            "sync_to_budget": True,
        },
        headers=auth_headers_user_a,
    )

    assert create_res.status_code == 201, create_res.text
    data = create_res.json()
    assert data["title"] == "ANA Flight to Tokyo"
    assert data["reservation_type"] == "flight"
    assert data["currency"] == "USD"
    assert data["budget_expense_id"] is not None

    budget_res = client.get(f"/v1/trips/{trip.id}/budget/", headers=auth_headers_user_a)
    assert budget_res.status_code == 200, budget_res.text
    expenses = budget_res.json()["expenses"]
    assert len(expenses) == 1
    assert expenses[0]["category"] == "transport"
    assert expenses[0]["amount"] == 642.5

    list_res = client.get(f"/v1/trips/{trip.id}/reservations/", headers=auth_headers_user_a)
    assert list_res.status_code == 200, list_res.text
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["confirmation_code"] == "ZX81PQ"


def test_update_and_delete_reservation(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)

    create_res = client.post(
        f"/v1/trips/{trip.id}/reservations/",
        json={
            "title": "Shinjuku Hotel",
            "reservation_type": "hotel",
            "amount": 480,
            "currency": "usd",
        },
        headers=auth_headers_user_a,
    )
    reservation_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/v1/trips/{trip.id}/reservations/{reservation_id}",
        json={
            "provider": "Hotel Gracery",
            "confirmation_code": "HOTEL123",
            "amount": 480,
            "currency": "jpy",
        },
        headers=auth_headers_user_a,
    )
    assert patch_res.status_code == 200, patch_res.text
    updated = patch_res.json()
    assert updated["provider"] == "Hotel Gracery"
    assert updated["currency"] == "JPY"

    delete_res = client.delete(
        f"/v1/trips/{trip.id}/reservations/{reservation_id}",
        headers=auth_headers_user_a,
    )
    assert delete_res.status_code == 204

    list_res = client.get(f"/v1/trips/{trip.id}/reservations/", headers=auth_headers_user_a)
    assert list_res.status_code == 200
    assert list_res.json() == []

    budget_res = client.get(f"/v1/trips/{trip.id}/budget/", headers=auth_headers_user_a)
    assert budget_res.status_code == 200
    assert budget_res.json()["expenses"] == []


def test_create_reservation_can_skip_budget_sync(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)

    create_res = client.post(
        f"/v1/trips/{trip.id}/reservations/",
        json={
            "title": "TeamLab tickets",
            "reservation_type": "activity",
            "amount": 54,
            "currency": "usd",
            "sync_to_budget": False,
        },
        headers=auth_headers_user_a,
    )

    assert create_res.status_code == 201, create_res.text
    assert create_res.json()["budget_expense_id"] is None

    budget_res = client.get(f"/v1/trips/{trip.id}/budget/", headers=auth_headers_user_a)
    assert budget_res.status_code == 200
    assert budget_res.json()["expenses"] == []


def test_reservations_respect_trip_ownership(client, db, user_a, user_b, auth_headers_user_a):
    trip = _create_trip(db, user_b.id)

    res = client.get(f"/v1/trips/{trip.id}/reservations/", headers=auth_headers_user_a)
    assert res.status_code == 404

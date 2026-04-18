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


def test_create_list_update_and_delete_prep_items(client, db, user_a, auth_headers_user_a):
    trip = _create_trip(db, user_a.id)

    create_res = client.post(
        f"/v1/trips/{trip.id}/prep/",
        json={
            "title": "Check passport validity",
            "prep_type": "document",
            "due_date": "2026-03-01",
            "notes": "Make sure it covers return travel too.",
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    item = create_res.json()
    assert item["completed"] is False
    assert item["prep_type"] == "document"

    list_res = client.get(f"/v1/trips/{trip.id}/prep/", headers=auth_headers_user_a)
    assert list_res.status_code == 200, list_res.text
    assert len(list_res.json()) == 1

    patch_res = client.patch(
        f"/v1/trips/{trip.id}/prep/{item['id']}",
        json={"completed": True},
        headers=auth_headers_user_a,
    )
    assert patch_res.status_code == 200, patch_res.text
    assert patch_res.json()["completed"] is True

    delete_res = client.delete(
        f"/v1/trips/{trip.id}/prep/{item['id']}",
        headers=auth_headers_user_a,
    )
    assert delete_res.status_code == 204

    list_after = client.get(f"/v1/trips/{trip.id}/prep/", headers=auth_headers_user_a)
    assert list_after.status_code == 200
    assert list_after.json() == []


def test_prep_items_respect_trip_ownership(client, db, user_a, user_b, auth_headers_user_a):
    trip = _create_trip(db, user_b.id)
    res = client.get(f"/v1/trips/{trip.id}/prep/", headers=auth_headers_user_a)
    assert res.status_code == 404

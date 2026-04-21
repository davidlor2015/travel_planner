"""
Integration tests for the on-trip execution log.

Covers:
- POST stop-status records an event and the next snapshot merges execution_status.
- Latest event per stop_ref wins.
- Unplanned stops appear on the snapshot for the current date.
- DELETE unplanned stop removes it from the snapshot.
- Membership and ownership guards (403/404 paths).
- Stop-ref validation (cannot target a stop that belongs to a different trip).
"""

from datetime import date, timedelta


def _create_active_trip(client, headers, *, title="Exec trip", destination="Lisbon"):
    today = date.today()
    res = client.post(
        "/v1/trips/",
        json={
            "title": title,
            "destination": destination,
            "description": None,
            "start_date": (today - timedelta(days=1)).isoformat(),
            "end_date": (today + timedelta(days=2)).isoformat(),
            "notes": None,
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _apply_basic_itinerary(client, headers, trip_id):
    today = date.today()
    res = client.post(
        "/v1/ai/apply",
        json={
            "trip_id": trip_id,
            "itinerary": {
                "title": "Plan",
                "summary": "Execution",
                "days": [
                    {
                        "day_number": 2,
                        "date": today.isoformat(),
                        "items": [
                            {
                                "time": "09:00",
                                "title": "Breakfast in Alfama",
                                "location": "Alfama",
                                "status": "planned",
                            },
                            {
                                "time": "13:00",
                                "title": "Tram 28",
                                "location": "Praca do Comercio",
                                "status": "planned",
                            },
                        ],
                    }
                ],
            },
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text


def _snapshot(client, headers, trip_id):
    res = client.get(f"/v1/trips/{trip_id}/on-trip-snapshot", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_stop_status_event_is_merged_into_snapshot(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)

    first = _snapshot(client, auth_headers_user_a, trip_id)
    assert len(first["today_stops"]) == 2
    stop_refs = [stop["stop_ref"] for stop in first["today_stops"]]
    assert all(ref is not None for ref in stop_refs)
    assert all(stop["execution_status"] is None for stop in first["today_stops"])

    target_ref = first["today_stops"][0]["stop_ref"]
    post_res = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    assert post_res.status_code == 201, post_res.text

    after = _snapshot(client, auth_headers_user_a, trip_id)
    confirmed = [stop for stop in after["today_stops"] if stop["stop_ref"] == target_ref][0]
    assert confirmed["execution_status"] == "confirmed"
    other = [stop for stop in after["today_stops"] if stop["stop_ref"] != target_ref][0]
    assert other["execution_status"] is None


def test_latest_stop_status_wins(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)

    target_ref = _snapshot(client, auth_headers_user_a, trip_id)["today_stops"][0]["stop_ref"]

    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "skipped"},
        headers=auth_headers_user_a,
    )
    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "planned"},
        headers=auth_headers_user_a,
    )

    merged = _snapshot(client, auth_headers_user_a, trip_id)["today_stops"]
    assert [stop for stop in merged if stop["stop_ref"] == target_ref][0]["execution_status"] == "planned"


def test_unplanned_stop_logged_appears_and_can_be_deleted(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)

    today = date.today()
    post_res = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={
            "day_date": today.isoformat(),
            "title": "Pasteis de Belem detour",
            "time": "16:30",
            "location": "Belem",
            "notes": "Line was short",
        },
        headers=auth_headers_user_a,
    )
    assert post_res.status_code == 201, post_res.text
    event_id = post_res.json()["id"]

    snapshot = _snapshot(client, auth_headers_user_a, trip_id)
    assert len(snapshot["today_unplanned"]) == 1
    logged = snapshot["today_unplanned"][0]
    assert logged["title"] == "Pasteis de Belem detour"
    assert logged["time"] == "16:30"
    assert logged["event_id"] == event_id

    del_res = client.delete(
        f"/v1/trips/{trip_id}/execution/events/{event_id}",
        headers=auth_headers_user_a,
    )
    assert del_res.status_code == 204, del_res.text

    assert _snapshot(client, auth_headers_user_a, trip_id)["today_unplanned"] == []


def test_unplanned_stop_blank_title_rejected(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    today = date.today()

    res = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": today.isoformat(), "title": "   "},
        headers=auth_headers_user_a,
    )
    assert res.status_code == 422, res.text


def test_stop_status_rejects_unknown_stop_ref(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)

    res = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": "999999", "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    assert res.status_code == 404


def test_stop_status_requires_trip_membership(client, auth_headers_user_a, auth_headers_user_b):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)
    target_ref = _snapshot(client, auth_headers_user_a, trip_id)["today_stops"][0]["stop_ref"]

    res = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "confirmed"},
        headers=auth_headers_user_b,
    )
    assert res.status_code == 404


def test_delete_unplanned_stop_forbidden_for_non_creator_non_owner(
    client, auth_headers_user_a, auth_headers_user_b, user_b
):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    # Invite user_b as a member so they can see the trip.
    client.post(
        f"/v1/trips/{trip_id}/members",
        json={"email": user_b.email},
        headers=auth_headers_user_a,
    )

    today = date.today()
    post_res = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": today.isoformat(), "title": "Owner-only log"},
        headers=auth_headers_user_a,
    )
    event_id = post_res.json()["id"]

    # user_b is a member but neither the event creator nor the trip owner.
    res = client.delete(
        f"/v1/trips/{trip_id}/execution/events/{event_id}",
        headers=auth_headers_user_b,
    )
    assert res.status_code == 403


def test_unplanned_stop_only_shows_for_its_day_date(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    tomorrow = date.today() + timedelta(days=1)

    client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": tomorrow.isoformat(), "title": "Tomorrow's stop"},
        headers=auth_headers_user_a,
    )

    snapshot = _snapshot(client, auth_headers_user_a, trip_id)
    assert snapshot["today_unplanned"] == []

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


def test_snapshot_includes_lat_lon_when_present(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
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
                                "lat": 38.7110,
                                "lon": -9.1290,
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
        headers=auth_headers_user_a,
    )
    assert res.status_code == 200, res.text

    snapshot = _snapshot(client, auth_headers_user_a, trip_id)
    assert len(snapshot["today_stops"]) == 2
    first = snapshot["today_stops"][0]
    assert first["title"] == "Breakfast in Alfama"
    assert first["lat"] == 38.711
    assert first["lon"] == -9.129
    second = snapshot["today_stops"][1]
    assert second["lat"] is None
    assert second["lon"] is None


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


# --- Overlay invariants: _pick_next_stop and _build_on_trip_blockers must respect
# the execution log, not just the saved plan. These tests lock the behavior in
# place so a refactor of either method fails loudly in CI.


def _apply_three_item_itinerary(client, headers, trip_id, statuses=None):
    """Apply an itinerary with three planned items today. `statuses` lets callers
    override plan-level statuses by index (e.g. mark the middle item skipped)."""
    today = date.today()
    statuses = statuses or ["planned", "planned", "planned"]
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
                                "title": "Breakfast",
                                "location": "Alfama",
                                "status": statuses[0],
                            },
                            {
                                "time": "13:00",
                                "title": "Tram 28",
                                "location": "Praca do Comercio",
                                "status": statuses[1],
                            },
                            {
                                "time": "18:00",
                                "title": "Fado",
                                "location": "Bairro Alto",
                                "status": statuses[2],
                            },
                        ],
                    }
                ],
            },
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text


def _blocker_ids(snapshot):
    return [blocker["id"] for blocker in snapshot.get("blockers", [])]


def test_next_stop_advances_after_confirmed_post(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_three_item_itinerary(client, auth_headers_user_a, trip_id)

    initial = _snapshot(client, auth_headers_user_a, trip_id)
    first_ref = initial["today_stops"][0]["stop_ref"]
    second_ref = initial["today_stops"][1]["stop_ref"]
    assert initial["next_stop"]["stop_ref"] == first_ref

    res = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": first_ref, "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    assert res.status_code == 201, res.text

    after = _snapshot(client, auth_headers_user_a, trip_id)
    assert after["next_stop"]["stop_ref"] == second_ref


def test_today_planned_open_blocker_disappears_when_all_stops_terminal(
    client, auth_headers_user_a
):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_three_item_itinerary(client, auth_headers_user_a, trip_id)

    before = _snapshot(client, auth_headers_user_a, trip_id)
    assert "today-planned-open" in _blocker_ids(before)

    # Mark two stops confirmed and one skipped via the execution log only; the
    # saved plan is never mutated.
    refs = [stop["stop_ref"] for stop in before["today_stops"]]
    for ref, status in zip(refs, ["confirmed", "skipped", "confirmed"]):
        res = client.post(
            f"/v1/trips/{trip_id}/execution/stop-status",
            json={"stop_ref": ref, "status": status},
            headers=auth_headers_user_a,
        )
        assert res.status_code == 201, res.text

    after = _snapshot(client, auth_headers_user_a, trip_id)
    assert "today-planned-open" not in _blocker_ids(after)
    assert after["next_stop"]["stop_ref"] is None


def test_reverting_to_planned_reopens_blocker_and_next_stop(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_three_item_itinerary(client, auth_headers_user_a, trip_id)

    initial = _snapshot(client, auth_headers_user_a, trip_id)
    refs = [stop["stop_ref"] for stop in initial["today_stops"]]

    for ref in refs:
        client.post(
            f"/v1/trips/{trip_id}/execution/stop-status",
            json={"stop_ref": ref, "status": "confirmed"},
            headers=auth_headers_user_a,
        )

    mid = _snapshot(client, auth_headers_user_a, trip_id)
    assert "today-planned-open" not in _blocker_ids(mid)
    assert mid["next_stop"]["stop_ref"] is None

    # Revert the first stop back to planned via the execution log. The blocker
    # must reappear and the reverted stop must become next again.
    revert = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": refs[0], "status": "planned"},
        headers=auth_headers_user_a,
    )
    assert revert.status_code == 201, revert.text

    after = _snapshot(client, auth_headers_user_a, trip_id)
    assert "today-planned-open" in _blocker_ids(after)
    assert after["next_stop"]["stop_ref"] == refs[0]


def test_plan_skipped_and_exec_confirmed_both_excluded_from_next_stop(
    client, auth_headers_user_a
):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    # Mark item 0 plan-level skipped; items 1 and 2 stay planned.
    _apply_three_item_itinerary(
        client,
        auth_headers_user_a,
        trip_id,
        statuses=["skipped", "planned", "planned"],
    )

    initial = _snapshot(client, auth_headers_user_a, trip_id)
    # Item 0 is plan-level skipped, so next_stop starts at item 1.
    assert initial["next_stop"]["stop_ref"] == initial["today_stops"][1]["stop_ref"]

    # Now confirm item 1 via the execution log. next_stop must skip both the
    # plan-skipped item 0 and the exec-confirmed item 1, landing on item 2.
    res = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={
            "stop_ref": initial["today_stops"][1]["stop_ref"],
            "status": "confirmed",
        },
        headers=auth_headers_user_a,
    )
    assert res.status_code == 201, res.text

    after = _snapshot(client, auth_headers_user_a, trip_id)
    assert after["next_stop"]["stop_ref"] == initial["today_stops"][2]["stop_ref"]


# --- Idempotency invariants: replays of the same write must not produce
# duplicate rows, and clients that omit an idempotency key must keep the
# legacy append-only behavior. These tests lock the contract the client-side
# `executeWithRetry` relies on when it replays a POST on flaky networks.


def _count_execution_events(db, trip_id, *, kind=None, stop_ref=None):
    from app.models.trip_execution_event import TripExecutionEvent

    query = db.query(TripExecutionEvent).filter(TripExecutionEvent.trip_id == trip_id)
    if kind is not None:
        query = query.filter(TripExecutionEvent.kind == kind)
    if stop_ref is not None:
        query = query.filter(TripExecutionEvent.stop_ref == stop_ref)
    return query.count()


def test_stop_status_replay_is_noop(client, auth_headers_user_a, db):
    """The repository's idempotency shortcut collapses a same-status replay onto
    the existing row instead of appending. A retried POST after a dropped 201
    must therefore leave exactly one stop_status row for that stop_ref."""
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_basic_itinerary(client, auth_headers_user_a, trip_id)
    target_ref = _snapshot(client, auth_headers_user_a, trip_id)["today_stops"][0]["stop_ref"]

    first = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    assert first.status_code == 201, first.text
    replay = client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": target_ref, "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    assert replay.status_code == 201, replay.text
    assert replay.json()["id"] == first.json()["id"]

    count = _count_execution_events(
        db, trip_id, kind="stop_status", stop_ref=target_ref
    )
    assert count == 1


def test_unplanned_stop_replay_with_client_request_id_is_idempotent(
    client, auth_headers_user_a, db
):
    """Two POSTs carrying the same client_request_id must collapse to the row
    persisted by the first — this is the guarantee the client-side retry on a
    dropped 201 depends on to avoid duplicate unplanned stops."""
    trip_id = _create_active_trip(client, auth_headers_user_a)
    today = date.today()
    request_id = "rid-abc-123"
    payload = {
        "day_date": today.isoformat(),
        "title": "Pasteis de Belem detour",
        "time": "16:30",
        "client_request_id": request_id,
    }

    first = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    assert first.status_code == 201, first.text
    replay = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    assert replay.status_code == 201, replay.text
    assert replay.json()["id"] == first.json()["id"]

    snapshot = _snapshot(client, auth_headers_user_a, trip_id)
    assert len(snapshot["today_unplanned"]) == 1
    assert (
        _count_execution_events(db, trip_id, kind="unplanned_stop") == 1
    )


def test_unplanned_stop_replay_without_client_request_id_still_appends(
    client, auth_headers_user_a, db
):
    """Legacy clients that don't send an idempotency key must keep today's
    append-only behavior so we don't silently break them."""
    trip_id = _create_active_trip(client, auth_headers_user_a)
    today = date.today()
    payload = {"day_date": today.isoformat(), "title": "Legacy detour"}

    first = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    assert first.status_code == 201, first.text
    second = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    assert second.status_code == 201, second.text
    assert first.json()["id"] != second.json()["id"]

    assert _count_execution_events(db, trip_id, kind="unplanned_stop") == 2


def test_unplanned_stop_replay_with_blank_client_request_id_is_appended(
    client, auth_headers_user_a, db
):
    """Empty/whitespace-only request ids are normalized to None so they do not
    collide across unrelated submissions. Two such posts must create two rows."""
    trip_id = _create_active_trip(client, auth_headers_user_a)
    today = date.today()
    payload = {
        "day_date": today.isoformat(),
        "title": "Whitespace rid",
        "client_request_id": "   ",
    }

    first = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    second = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json=payload,
        headers=auth_headers_user_a,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert _count_execution_events(db, trip_id, kind="unplanned_stop") == 2


def test_delete_execution_event_twice_second_is_404(client, auth_headers_user_a):
    """Documents the server-side behavior the client-side `treat404AsSuccess`
    flag relies on: a second DELETE of an already-removed event returns 404,
    which the client treats as success because DELETE is idempotent."""
    trip_id = _create_active_trip(client, auth_headers_user_a)
    today = date.today()
    post_res = client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": today.isoformat(), "title": "Will be removed"},
        headers=auth_headers_user_a,
    )
    event_id = post_res.json()["id"]

    first = client.delete(
        f"/v1/trips/{trip_id}/execution/events/{event_id}",
        headers=auth_headers_user_a,
    )
    assert first.status_code == 204
    second = client.delete(
        f"/v1/trips/{trip_id}/execution/events/{event_id}",
        headers=auth_headers_user_a,
    )
    assert second.status_code == 404


def test_execution_summary_returns_latest_status_counts_and_unplanned_total(
    client, auth_headers_user_a
):
    trip_id = _create_active_trip(client, auth_headers_user_a)
    _apply_three_item_itinerary(client, auth_headers_user_a, trip_id)

    initial = _snapshot(client, auth_headers_user_a, trip_id)
    refs = [stop["stop_ref"] for stop in initial["today_stops"]]

    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": refs[0], "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": refs[1], "status": "skipped"},
        headers=auth_headers_user_a,
    )
    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": refs[2], "status": "confirmed"},
        headers=auth_headers_user_a,
    )
    # Latest status wins: this stop should not be counted as confirmed.
    client.post(
        f"/v1/trips/{trip_id}/execution/stop-status",
        json={"stop_ref": refs[2], "status": "planned"},
        headers=auth_headers_user_a,
    )

    today = date.today()
    client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": today.isoformat(), "title": "Coffee break"},
        headers=auth_headers_user_a,
    )
    client.post(
        f"/v1/trips/{trip_id}/execution/unplanned-stop",
        json={"day_date": today.isoformat(), "title": "Photo stop"},
        headers=auth_headers_user_a,
    )

    res = client.get(
        f"/v1/trips/{trip_id}/execution-summary",
        headers=auth_headers_user_a,
    )
    assert res.status_code == 200, res.text
    assert res.json() == {
        "confirmed_stops_count": 1,
        "skipped_stops_count": 1,
        "unplanned_stops_count": 2,
    }


def test_execution_summary_returns_zero_counts_without_events(client, auth_headers_user_a):
    trip_id = _create_active_trip(client, auth_headers_user_a)

    res = client.get(
        f"/v1/trips/{trip_id}/execution-summary",
        headers=auth_headers_user_a,
    )
    assert res.status_code == 200, res.text
    assert res.json() == {
        "confirmed_stops_count": 0,
        "skipped_stops_count": 0,
        "unplanned_stops_count": 0,
    }


def test_execution_summary_requires_trip_membership(
    client, auth_headers_user_a, auth_headers_user_b
):
    trip_id = _create_active_trip(client, auth_headers_user_a)

    res = client.get(
        f"/v1/trips/{trip_id}/execution-summary",
        headers=auth_headers_user_b,
    )
    assert res.status_code == 404

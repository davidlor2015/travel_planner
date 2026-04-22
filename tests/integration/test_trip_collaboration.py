from datetime import date, timedelta


def _create_shared_trip(client, auth_headers_user_a, user_b) -> int:
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Group Escape",
            "destination": "Barcelona",
            "description": None,
            "start_date": "2026-10-02",
            "end_date": "2026-10-07",
            "notes": "Shared city break",
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
    return trip_id


def _verify_email(client, email: str) -> None:
    request_res = client.post(
        "/v1/auth/email-verification/request",
        json={"email": email},
    )
    assert request_res.status_code == 200, request_res.text
    verification_url = request_res.json()["verification_url"]
    assert verification_url
    token = verification_url.split("token=", 1)[1]

    confirm_res = client.post(
        "/v1/auth/email-verification/confirm",
        json={"token": token},
    )
    assert confirm_res.status_code == 204, confirm_res.text


def test_personal_planning_state_is_isolated_between_trip_members(
    client,
    user_b,
    auth_headers_user_a,
    auth_headers_user_b,
):
    trip_id = _create_shared_trip(client, auth_headers_user_a, user_b)

    owner_pack = client.post(
        f"/v1/trips/{trip_id}/packing/",
        json={"label": "Passport"},
        headers=auth_headers_user_a,
    )
    owner_budget = client.patch(
        f"/v1/trips/{trip_id}/budget/limit",
        json={"limit": 1200},
        headers=auth_headers_user_a,
    )
    owner_prep = client.post(
        f"/v1/trips/{trip_id}/prep/",
        json={"title": "Renew travel insurance", "prep_type": "checklist"},
        headers=auth_headers_user_a,
    )

    assert owner_pack.status_code == 201, owner_pack.text
    assert owner_budget.status_code == 200, owner_budget.text
    assert owner_prep.status_code == 201, owner_prep.text

    member_pack = client.get(f"/v1/trips/{trip_id}/packing/", headers=auth_headers_user_b)
    member_budget = client.get(f"/v1/trips/{trip_id}/budget/", headers=auth_headers_user_b)
    member_prep = client.get(f"/v1/trips/{trip_id}/prep/", headers=auth_headers_user_b)

    assert member_pack.status_code == 200, member_pack.text
    assert member_budget.status_code == 200, member_budget.text
    assert member_prep.status_code == 200, member_prep.text

    assert member_pack.json() == []
    assert member_budget.json()["limit"] is None
    assert member_budget.json()["expenses"] == []
    assert member_prep.json() == []


def test_shared_reservations_are_visible_to_all_members_but_budget_sync_stays_personal(
    client,
    user_b,
    auth_headers_user_a,
    auth_headers_user_b,
):
    trip_id = _create_shared_trip(client, auth_headers_user_a, user_b)

    reservation_res = client.post(
        f"/v1/trips/{trip_id}/reservations/",
        json={
            "title": "Shared hotel",
            "reservation_type": "hotel",
            "amount": 480,
            "currency": "usd",
            "sync_to_budget": True,
        },
        headers=auth_headers_user_b,
    )
    assert reservation_res.status_code == 201, reservation_res.text
    assert reservation_res.json()["budget_expense_id"] is not None

    owner_reservations = client.get(f"/v1/trips/{trip_id}/reservations/", headers=auth_headers_user_a)
    owner_budget = client.get(f"/v1/trips/{trip_id}/budget/", headers=auth_headers_user_a)
    member_budget = client.get(f"/v1/trips/{trip_id}/budget/", headers=auth_headers_user_b)

    assert owner_reservations.status_code == 200, owner_reservations.text
    assert len(owner_reservations.json()) == 1
    assert owner_reservations.json()[0]["title"] == "Shared hotel"

    assert owner_budget.status_code == 200, owner_budget.text
    assert owner_budget.json()["expenses"] == []

    assert member_budget.status_code == 200, member_budget.text
    assert len(member_budget.json()["expenses"]) == 1
    assert member_budget.json()["expenses"][0]["label"] == "Shared hotel"


def test_trip_invite_can_be_accepted_after_login(
    client,
    auth_headers_user_a,
):
    register_res = client.post(
        "/v1/auth/register",
        json={"email": "invitee@example.com", "password": "password789"},
    )
    assert register_res.status_code == 200, register_res.text
    _verify_email(client, "invitee@example.com")

    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "Invite Flow",
            "destination": "Lisbon",
            "description": None,
            "start_date": "2026-10-02",
            "end_date": "2026-10-07",
            "notes": "Shared city break",
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    invite_res = client.post(
        f"/v1/trips/{trip_id}/invites",
        json={"email": "invitee@example.com"},
        headers=auth_headers_user_a,
    )
    assert invite_res.status_code == 201, invite_res.text
    invite_url = invite_res.json()["invite_url"]
    token = invite_url.rsplit("/", 1)[1]

    detail_res = client.get(f"/v1/trip-invites/{token}")
    assert detail_res.status_code == 200, detail_res.text
    assert detail_res.json()["status"] == "pending"

    login_res = client.post(
        "/v1/auth/login",
        data={"username": "invitee@example.com", "password": "password789"},
    )
    assert login_res.status_code == 200, login_res.text
    invitee_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    accept_res = client.post(
        f"/v1/trip-invites/{token}/accept",
        headers=invitee_headers,
    )
    assert accept_res.status_code == 200, accept_res.text
    assert accept_res.json()["trip_id"] == trip_id
    assert accept_res.json()["status"] == "accepted"

    trips_res = client.get("/v1/trips/", headers=invitee_headers)
    assert trips_res.status_code == 200, trips_res.text
    assert [trip["id"] for trip in trips_res.json()] == [trip_id]


def test_on_trip_snapshot_resolves_today_and_next_stop_conservatively(
    client,
    auth_headers_user_a,
):
    today = date.today()
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "On Trip",
            "destination": "Tokyo",
            "description": None,
            "start_date": (today - timedelta(days=1)).isoformat(),
            "end_date": (today + timedelta(days=2)).isoformat(),
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    apply_res = client.post(
        "/v1/ai/apply",
        json={
            "trip_id": trip_id,
            "itinerary": {
                "title": "Live plan",
                "summary": "Execution mode",
                "days": [
                    {
                        "day_number": 2,
                        "date": today.isoformat(),
                        "items": [
                            {
                                "time": "09:00",
                                "title": "Asakusa walk",
                                "location": "Asakusa",
                                "status": "confirmed",
                            }
                        ],
                    },
                    {
                        "day_number": 3,
                        "date": (today + timedelta(days=1)).isoformat(),
                        "items": [
                            {
                                "time": "11:00",
                                "title": "Shinjuku lunch",
                                "location": "Shinjuku",
                                "status": "planned",
                            }
                        ],
                    },
                ],
            },
        },
        headers=auth_headers_user_a,
    )
    assert apply_res.status_code == 200, apply_res.text

    snapshot_res = client.get(
        f"/v1/trips/{trip_id}/on-trip-snapshot",
        headers=auth_headers_user_a,
    )
    assert snapshot_res.status_code == 200, snapshot_res.text
    payload = snapshot_res.json()

    assert payload["mode"] == "active"
    # Trip owner has normal collaboration/write access; read_only must be
    # derived from permissions, not hardcoded.
    assert payload["read_only"] is False
    assert payload["today"]["title"] == "Asakusa walk"
    assert payload["today"]["source"] == "day_date_exact"
    assert payload["today"]["confidence"] == "high"
    assert payload["next_stop"]["title"] is not None
    assert payload["next_stop"]["confidence"] in {"high", "medium"}


def test_on_trip_snapshot_blockers_use_execution_bucket(
    client,
    auth_headers_user_a,
):
    today = date.today()
    create_res = client.post(
        "/v1/trips/",
        json={
            "title": "On Trip Blockers",
            "destination": "Berlin",
            "description": None,
            "start_date": (today - timedelta(days=1)).isoformat(),
            "end_date": (today + timedelta(days=1)).isoformat(),
            "notes": None,
        },
        headers=auth_headers_user_a,
    )
    assert create_res.status_code == 201, create_res.text
    trip_id = create_res.json()["id"]

    apply_res = client.post(
        "/v1/ai/apply",
        json={
            "trip_id": trip_id,
            "itinerary": {
                "title": "Blockers plan",
                "summary": "Execution blockers",
                "days": [
                    {
                        "day_number": 2,
                        "date": today.isoformat(),
                        "anchors": [
                            {
                                "type": "flight",
                                "label": "UA 100",
                                "time": None,
                            }
                        ],
                        "items": [
                            {
                                "time": "10:00",
                                "title": "Hotel check-in",
                                "status": "planned",
                            }
                        ],
                    }
                ],
            },
        },
        headers=auth_headers_user_a,
    )
    assert apply_res.status_code == 200, apply_res.text

    snapshot_res = client.get(
        f"/v1/trips/{trip_id}/on-trip-snapshot",
        headers=auth_headers_user_a,
    )
    assert snapshot_res.status_code == 200, snapshot_res.text
    payload = snapshot_res.json()

    assert payload["mode"] == "active"
    assert payload["blockers"]
    assert all(blocker["bucket"] == "on_trip_execution" for blocker in payload["blockers"])
    blocker_ids = {blocker["id"] for blocker in payload["blockers"]}
    assert "today-planned-open" in blocker_ids
    assert "today-anchor-time-missing" in blocker_ids


def test_on_trip_snapshot_is_not_read_only_for_accepted_member(
    client,
    user_b,
    auth_headers_user_a,
    auth_headers_user_b,
):
    """An accepted collaborator has the same execution permission as the owner.

    On-Trip is the execution surface, so `read_only` must reflect actual
    permission, not membership vs ownership.
    """
    trip_id = _create_shared_trip(client, auth_headers_user_a, user_b)

    snapshot_res = client.get(
        f"/v1/trips/{trip_id}/on-trip-snapshot",
        headers=auth_headers_user_b,
    )
    assert snapshot_res.status_code == 200, snapshot_res.text
    assert snapshot_res.json()["read_only"] is False

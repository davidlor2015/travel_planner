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

"""
Auth API integration tests.

Hit real FastAPI endpoints via TestClient against an in-memory SQLite DB.
Tests verify the full request path: router → deps → service → DB → response.
"""


def _verify_email(client, email: str) -> None:
    request_res = client.post(
        "/v1/auth/email-verification/request",
        json={"email": email},
    )
    assert request_res.status_code == 200, request_res.text
    verification_url = request_res.json()["verification_url"]
    assert verification_url
    token = verification_url.split("token=", 1)[1]

    validate_res = client.get("/v1/auth/email-verification/validate", params={"token": token})
    assert validate_res.status_code == 200, validate_res.text
    assert validate_res.json()["valid"] is True

    confirm_res = client.post(
        "/v1/auth/email-verification/confirm",
        json={"token": token},
    )
    assert confirm_res.status_code == 204, confirm_res.text


def test_register_user(client):
    response = client.post(
        "/v1/auth/register",
        json={"email": "testuser@example.com", "password": "testme1"},
    )

    assert response.status_code == 200, response.text
    data = response.json()

    assert data["email"] == "testuser@example.com"
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data
    assert data["email_verified"] is False


def test_login_requires_verified_email(client):
    client.post(
        "/v1/auth/register",
        json={"email": "pending@example.com", "password": "password1"},
    )

    response = client.post(
        "/v1/auth/login",
        data={"username": "pending@example.com", "password": "password1"},
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Email not verified"


def test_login_user(client):
    client.post(
        "/v1/auth/register",
        json={"email": "login@example.com", "password": "password1"},
    )
    _verify_email(client, "login@example.com")

    response = client.post(
        "/v1/auth/login",
        data={"username": "login@example.com", "password": "password1"},
    )

    assert response.status_code == 200, response.text
    data = response.json()

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/v1/auth/register",
        json={"email": "beap@example.com", "password": "password111"},
    )

    response = client.post(
        "/v1/auth/login",
        data={"username": "beap@example.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401


def test_read_users_me(client):
    client.post(
        "/v1/auth/register",
        json={"email": "me@example.com", "password": "password111"},
    )
    _verify_email(client, "me@example.com")

    login_res = client.post(
        "/v1/auth/login",
        data={"username": "me@example.com", "password": "password111"},
    )
    assert login_res.status_code == 200, login_res.text

    token = login_res.json()["access_token"]

    response = client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["email"] == "me@example.com"


def test_refresh_session_returns_new_token_pair(client):
    client.post(
        "/v1/auth/register",
        json={"email": "refresh@example.com", "password": "password123"},
    )
    _verify_email(client, "refresh@example.com")

    login_res = client.post(
        "/v1/auth/login",
        data={"username": "refresh@example.com", "password": "password123"},
    )
    assert login_res.status_code == 200, login_res.text

    refresh_res = client.post(
        "/v1/auth/refresh",
        json={"refresh_token": login_res.json()["refresh_token"]},
    )

    assert refresh_res.status_code == 200, refresh_res.text
    data = refresh_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_password_reset_flow_updates_password(client):
    client.post(
        "/v1/auth/register",
        json={"email": "reset@example.com", "password": "oldpassword"},
    )
    _verify_email(client, "reset@example.com")

    request_res = client.post(
        "/v1/auth/password-reset/request",
        json={"email": "reset@example.com"},
    )
    assert request_res.status_code == 200, request_res.text
    reset_url = request_res.json()["reset_url"]
    assert reset_url
    token = reset_url.split("token=", 1)[1]

    validate_res = client.get("/v1/auth/password-reset/validate", params={"token": token})
    assert validate_res.status_code == 200, validate_res.text
    assert validate_res.json()["valid"] is True

    confirm_res = client.post(
        "/v1/auth/password-reset/confirm",
        json={"token": token, "password": "newpassword"},
    )
    assert confirm_res.status_code == 204, confirm_res.text

    old_login_res = client.post(
        "/v1/auth/login",
        data={"username": "reset@example.com", "password": "oldpassword"},
    )
    assert old_login_res.status_code == 401

    new_login_res = client.post(
        "/v1/auth/login",
        data={"username": "reset@example.com", "password": "newpassword"},
    )
    assert new_login_res.status_code == 200, new_login_res.text


def test_email_verification_link_cannot_be_reused(client):
    client.post(
        "/v1/auth/register",
        json={"email": "twice@example.com", "password": "password456"},
    )

    request_res = client.post(
        "/v1/auth/email-verification/request",
        json={"email": "twice@example.com"},
    )
    assert request_res.status_code == 200, request_res.text
    verification_url = request_res.json()["verification_url"]
    assert verification_url
    token = verification_url.split("token=", 1)[1]

    first_confirm_res = client.post(
        "/v1/auth/email-verification/confirm",
        json={"token": token},
    )
    assert first_confirm_res.status_code == 204, first_confirm_res.text

    second_confirm_res = client.post(
        "/v1/auth/email-verification/confirm",
        json={"token": token},
    )
    assert second_confirm_res.status_code == 400, second_confirm_res.text

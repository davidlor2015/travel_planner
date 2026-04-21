from pydantic import ValidationError

from app.core.config import Settings


def test_settings_reject_placeholder_jwt_secret():
    try:
        Settings(JWT_SECRET="change-me")
    except ValidationError:
        pass
    else:
        raise AssertionError("Settings accepted an insecure placeholder JWT secret")


def test_settings_reject_short_jwt_secret():
    try:
        Settings(JWT_SECRET="too-short")
    except ValidationError:
        pass
    else:
        raise AssertionError("Settings accepted a JWT secret shorter than 32 characters")

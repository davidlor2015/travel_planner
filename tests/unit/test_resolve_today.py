"""
Unit tests for `TripService._resolve_today`.

These lock the contract the client-side "Now" pipeline depends on:

- When a valid IANA timezone is supplied, the returned date reflects that
  zone's wall-clock — a traveler in `Pacific/Auckland` sees April 23 while the
  server UTC clock still shows April 22.
- When the parameter is missing, the server falls back to `date.today()`.
- Invalid or malformed strings MUST fall back silently; we never want a bad
  query parameter to 500 the snapshot endpoint (the client can't recover).
"""

from datetime import date, datetime, timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest

from app.services.trip_service import TripService


# 2026-04-22 22:00 UTC is:
#   * 2026-04-23 10:00 in Pacific/Auckland (UTC+12)
#   * 2026-04-22 12:00 in Pacific/Honolulu (UTC-10)
# A single server-side UTC instant where two IANA zones disagree on "today".
CROSSOVER_UTC = datetime(2026, 4, 22, 22, 0, tzinfo=timezone.utc)


def _patched_datetime_class(fixed_utc: datetime):
    """Build a datetime subclass whose .now(tz) returns `fixed_utc` projected
    into `tz`. Only .now is overridden; everything else delegates to the real
    datetime so ZoneInfo lookups and equality checks keep working."""

    class _PatchedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            if tz is None:
                return fixed_utc.astimezone().replace(tzinfo=None)
            return fixed_utc.astimezone(tz)

    return _PatchedDateTime


@pytest.mark.parametrize(
    "tz_name, expected",
    [
        ("Pacific/Auckland", date(2026, 4, 23)),
        ("Pacific/Honolulu", date(2026, 4, 22)),
    ],
)
def test_resolves_valid_iana_timezones_at_crossover(tz_name, expected):
    patched = _patched_datetime_class(CROSSOVER_UTC)
    with patch("app.services.trip_service.datetime", patched):
        assert TripService._resolve_today(tz_name) == expected


def test_resolves_utc_at_crossover():
    """Sanity check the test harness: UTC itself should report 2026-04-22."""
    patched = _patched_datetime_class(CROSSOVER_UTC)
    with patch("app.services.trip_service.datetime", patched):
        assert patched.now(ZoneInfo("UTC")).date() == date(2026, 4, 22)
        assert TripService._resolve_today("UTC") == date(2026, 4, 22)
       

def test_resolves_none_to_server_today():
    with patch("app.services.trip_service.date") as date_mod:
        date_mod.today.return_value = date(2026, 4, 22)
        assert TripService._resolve_today(None) == date(2026, 4, 22)


def test_resolves_empty_string_to_server_today():
    with patch("app.services.trip_service.date") as date_mod:
        date_mod.today.return_value = date(2026, 4, 22)
        assert TripService._resolve_today("") == date(2026, 4, 22)


def test_resolves_invalid_tz_to_server_today_silently():
    """A bogus tz name must fall through to date.today() without raising. The
    snapshot endpoint is user-facing and a typo in the request must not 500."""
    with patch("app.services.trip_service.date") as date_mod:
        date_mod.today.return_value = date(2026, 4, 22)
        assert TripService._resolve_today("Not/AZone") == date(2026, 4, 22)


def test_resolves_garbage_value_to_server_today_silently():
    with patch("app.services.trip_service.date") as date_mod:
        date_mod.today.return_value = date(2026, 4, 22)
        assert TripService._resolve_today("???") == date(2026, 4, 22)

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.trip_access_service import TripAccessContext, TripAccessService


# ── can_execute_on_trip (pure predicate, no DB) ───────────────────────────────

def _ctx(role: str) -> TripAccessContext:
    membership = SimpleNamespace(role=role)
    return TripAccessContext(trip=None, membership=membership, member_state=None)


def test_owner_can_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_ctx("owner")) is True


def test_accepted_member_can_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_ctx("member")) is True


def test_unknown_role_cannot_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_ctx("viewer")) is False


def test_empty_role_cannot_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_ctx("")) is False


# ── require_membership (repo mocked) ─────────────────────────────────────────

def _make_service():
    """Return a TripAccessService with a mocked DB session."""
    db = MagicMock()
    return TripAccessService(db)


def _make_membership(role: str, has_state: bool = True) -> MagicMock:
    membership = MagicMock()
    membership.role = role
    membership.trip = MagicMock()
    membership.member_state = MagicMock() if has_state else None
    return membership


@patch("app.services.trip_access_service.TripMembershipRepository")
class TestRequireMembership:

    def test_nonexistent_trip_raises_404(self, MockRepo):
        MockRepo.return_value.get_context.return_value = None
        svc = _make_service()

        with pytest.raises(HTTPException) as exc:
            svc.require_membership(trip_id=99, user_id=1)

        assert exc.value.status_code == 404

    def test_membership_without_state_raises_404(self, MockRepo):
        MockRepo.return_value.get_context.return_value = _make_membership("member", has_state=False)
        svc = _make_service()

        with pytest.raises(HTTPException) as exc:
            svc.require_membership(trip_id=1, user_id=1)

        assert exc.value.status_code == 404

    def test_owner_access_default_succeeds(self, MockRepo):
        m = _make_membership("owner")
        MockRepo.return_value.get_context.return_value = m
        svc = _make_service()

        ctx = svc.require_membership(trip_id=1, user_id=1)

        assert ctx.membership is m
        assert ctx.trip is m.trip
        assert ctx.member_state is m.member_state

    def test_member_access_default_succeeds(self, MockRepo):
        m = _make_membership("member")
        MockRepo.return_value.get_context.return_value = m
        svc = _make_service()

        ctx = svc.require_membership(trip_id=1, user_id=2)

        assert ctx.membership is m

    def test_owner_only_passes_for_owner(self, MockRepo):
        MockRepo.return_value.get_context.return_value = _make_membership("owner")
        svc = _make_service()

        ctx = svc.require_membership(trip_id=1, user_id=1, owner_only=True)

        assert ctx.membership.role == "owner"

    def test_owner_only_raises_403_for_member(self, MockRepo):
        MockRepo.return_value.get_context.return_value = _make_membership("member")
        svc = _make_service()

        with pytest.raises(HTTPException) as exc:
            svc.require_membership(trip_id=1, user_id=2, owner_only=True)

        assert exc.value.status_code == 403

    def test_repo_called_with_correct_ids(self, MockRepo):
        MockRepo.return_value.get_context.return_value = _make_membership("owner")
        svc = _make_service()

        svc.require_membership(trip_id=42, user_id=7)

        MockRepo.return_value.get_context.assert_called_once_with(42, 7)

    def test_404_detail_message(self, MockRepo):
        MockRepo.return_value.get_context.return_value = None
        svc = _make_service()

        with pytest.raises(HTTPException) as exc:
            svc.require_membership(trip_id=1, user_id=1)

        assert "not found" in exc.value.detail.lower()

    def test_403_detail_message(self, MockRepo):
        MockRepo.return_value.get_context.return_value = _make_membership("member")
        svc = _make_service()

        with pytest.raises(HTTPException) as exc:
            svc.require_membership(trip_id=1, user_id=1, owner_only=True)

        assert "owner" in exc.value.detail.lower()

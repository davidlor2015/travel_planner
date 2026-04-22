from types import SimpleNamespace

from app.services.trip_access_service import TripAccessContext, TripAccessService


def _context(role: str) -> TripAccessContext:
    """Build a minimal context for testing the pure permission predicate.

    The predicate only reads `context.membership.role`; the service/db are
    not touched, so we avoid setting up a full SQLAlchemy fixture here.
    """
    membership = SimpleNamespace(role=role)
    return TripAccessContext(trip=None, membership=membership, member_state=None)


def test_owner_can_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_context("owner")) is True


def test_accepted_member_can_execute_on_trip():
    assert TripAccessService.can_execute_on_trip(_context("member")) is True


def test_unknown_role_cannot_execute_on_trip():
    # Future viewer / archived / locked states should fall through here until
    # they are explicitly added to the allow-list.
    assert TripAccessService.can_execute_on_trip(_context("viewer")) is False

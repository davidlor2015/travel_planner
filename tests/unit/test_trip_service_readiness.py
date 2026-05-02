from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.services.trip_service import TripService


def _membership(email: str):
    state = SimpleNamespace(
        packing_items=[],
        budget_limit=None,
        budget_expenses=[],
        prep_items=[],
    )
    return SimpleNamespace(
        user_id=1,
        email=email,
        role="owner",
        member_state=state,
    )


def test_member_readiness_skips_itinerary_lookup_outside_blocker_window():
    svc = TripService(MagicMock())

    trip = SimpleNamespace(
        id=7,
        title="Later Trip",
        description=None,
        notes=None,
        start_date=date.today() + timedelta(days=30),
    )
    context = SimpleNamespace(trip=trip)

    svc.access_service = MagicMock()
    svc.access_service.require_membership.return_value = context
    svc.membership_repo = MagicMock()
    svc.membership_repo.list_with_planning_by_trip.return_value = [_membership("owner@example.com")]
    svc.itinerary_repo = MagicMock()

    response = svc.get_member_readiness(trip_id=trip.id, user_id=1)

    assert len(response.members) == 1
    svc.itinerary_repo.to_itinerary_response.assert_not_called()


def test_member_readiness_reads_itinerary_inside_blocker_window():
    svc = TripService(MagicMock())

    trip = SimpleNamespace(
        id=9,
        title="Soon Trip",
        description=None,
        notes=None,
        start_date=date.today() + timedelta(days=3),
    )
    context = SimpleNamespace(trip=trip)

    svc.access_service = MagicMock()
    svc.access_service.require_membership.return_value = context
    svc.membership_repo = MagicMock()
    svc.membership_repo.list_with_planning_by_trip.return_value = [_membership("owner@example.com")]
    svc.itinerary_repo = MagicMock()
    svc.itinerary_repo.to_itinerary_response.return_value = None

    response = svc.get_member_readiness(trip_id=trip.id, user_id=1)

    assert len(response.members) == 1
    svc.itinerary_repo.to_itinerary_response.assert_called_once()

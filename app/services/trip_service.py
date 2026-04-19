from datetime import date

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories.trip_repository import TripRepository
from app.repositories.trip_membership_repository import TripMembershipRepository
from app.repositories.travel_profile_repository import TravelProfileRepository
from app.repositories.user_repository import UserRepository
from app.models.trip import Trip
from app.models.trip_membership import TripMembership, TripMemberState
from app.schemas.trip import TripCreate, TripMemberAddRequest, TripMemberResponse, TripUpdate
from app.services.matching_service import MatchingService
from app.services.trip_access_service import TripAccessService


class TripService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TripRepository(db)
        self.membership_repo = TripMembershipRepository(db)
        self.user_repo = UserRepository(db)
        self.profile_repo = TravelProfileRepository(db)
        self.matching_service = MatchingService(db)
        self.access_service = TripAccessService(db)

    def create(self, trip_in: TripCreate, user_id: int) -> Trip:
        profile = self.profile_repo.get_by_user(user_id)
        trip = Trip(
            **trip_in.model_dump(),
            user_id=user_id,
            is_discoverable=profile.is_discoverable if profile else True,
        )
        self.db.add(trip)
        self.db.flush()

        membership = TripMembership(
            trip_id=trip.id,
            user_id=user_id,
            role="owner",
            added_by_user_id=user_id,
        )
        self.db.add(membership)
        self.db.flush()

        self.db.add(TripMemberState(membership_id=membership.id))
        self.db.commit()
        return self.repo.get_by_id_and_user(trip.id, user_id) or trip

    def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> list[Trip]:
        return self.repo.get_all_by_user(user_id, skip, limit)

    def get_summaries(self, user_id: int, skip: int = 0, limit: int = 100) -> list[dict[str, object]]:
        trips = self.repo.get_all_by_user_with_planning(user_id, skip, limit)
        summaries: list[dict[str, object]] = []
        today = date.today()
        for trip in trips:
            membership = next(
                (member for member in trip.memberships if member.user_id == user_id),
                None,
            )
            state = membership.member_state if membership else None
            if state is None:
                continue

            packing_total = len(state.packing_items)
            packing_checked = sum(1 for item in state.packing_items if item.checked)
            packing_progress_pct = 0 if packing_total == 0 else round((packing_checked / packing_total) * 100)
            reservation_count = len(trip.reservations)
            reservation_upcoming_count = sum(
                1
                for reservation in trip.reservations
                if reservation.start_at is not None and reservation.start_at.date() >= today
            )
            prep_total = len(state.prep_items)
            prep_completed = sum(1 for item in state.prep_items if item.completed)
            prep_overdue_count = sum(
                1
                for item in state.prep_items
                if not item.completed and item.due_date is not None and item.due_date < today
            )

            budget_total_spent = float(sum(expense.amount for expense in state.budget_expenses))
            budget_remaining = (
                float(state.budget_limit - budget_total_spent)
                if state.budget_limit is not None
                else None
            )
            summaries.append({
                "trip_id": trip.id,
                "packing_total": packing_total,
                "packing_checked": packing_checked,
                "packing_progress_pct": packing_progress_pct,
                "reservation_count": reservation_count,
                "reservation_upcoming_count": reservation_upcoming_count,
                "prep_total": prep_total,
                "prep_completed": prep_completed,
                "prep_overdue_count": prep_overdue_count,
                "budget_limit": float(state.budget_limit) if state.budget_limit is not None else None,
                "budget_total_spent": budget_total_spent,
                "budget_remaining": budget_remaining,
                "budget_is_over": budget_remaining is not None and budget_remaining < 0,
                "budget_expense_count": len(state.budget_expenses),
            })
        return summaries

    def get_one(self, trip_id: int, user_id: int) -> Trip:
        return self.access_service.require_membership(trip_id, user_id).trip

    def update(self, trip_id: int, user_id: int, trip_in: TripUpdate) -> Trip:
        trip = self.access_service.require_membership(trip_id, user_id).trip
        updated_trip = self.repo.update(trip, trip_in.model_dump(exclude_unset=True))
        self.matching_service._invalidate(updated_trip.user_id)
        return updated_trip

    def delete(self, trip_id: int, user_id: int) -> None:
        context = self.access_service.require_membership(trip_id, user_id, owner_only=True)
        trip = context.trip
        self.repo.delete(trip)
        self.matching_service._invalidate(trip.user_id)

    def list_members(self, trip_id: int, user_id: int) -> list[TripMemberResponse]:
        self.access_service.require_membership(trip_id, user_id)
        memberships = self.membership_repo.list_by_trip(trip_id)
        return [TripMemberResponse.model_validate(membership) for membership in memberships]

    def add_member(
        self,
        trip_id: int,
        actor_user_id: int,
        member_in: TripMemberAddRequest,
    ) -> TripMemberResponse:
        context = self.access_service.require_membership(trip_id, actor_user_id, owner_only=True)
        user = self.user_repo.get_by_email(member_in.email)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        existing = self.membership_repo.get_by_trip_and_user(trip_id, user.id)
        if existing is not None:
            raise HTTPException(status_code=409, detail="User is already a trip member")

        membership = TripMembership(
            trip_id=trip_id,
            user_id=user.id,
            role="member",
            added_by_user_id=actor_user_id,
        )
        self.db.add(membership)
        self.db.flush()
        self.db.add(TripMemberState(membership_id=membership.id))
        self.db.commit()
        self.db.refresh(membership)
        self.db.refresh(context.trip)
        return TripMemberResponse.model_validate(membership)

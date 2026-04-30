# Path: app/repositories/trip_repository.py
# Summary: Implements data access for trip repository operations.

from datetime import date, datetime, time
from typing import Optional, List

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.budget_expense import BudgetExpense
from app.models.match_interaction import MatchInteraction
from app.models.match_request import MatchRequest
from app.models.match_result import MatchResult
from app.models.packing_item import PackingItem
from app.models.prep_item import PrepItem
from app.models.reservation import Reservation
from app.models.trip import Trip
from app.models.trip_execution_event import TripExecutionEvent
from app.models.trip_membership import TripMemberState, TripMembership
from app.repositories.base import BaseRepository


class TripRepository(BaseRepository[Trip]):
    def __init__(self, db: Session):
        super().__init__(Trip, db)

    def _member_options(self):
        return (
            selectinload(Trip.memberships).selectinload(TripMembership.user),
            selectinload(Trip.memberships).selectinload(TripMembership.member_state),
            selectinload(Trip.invites),
        )

    def _list_options(self):
        return (
            selectinload(Trip.memberships).selectinload(TripMembership.user),
            selectinload(Trip.invites),
        )

    def get_by_id_and_user(self, trip_id: int, user_id: int) -> Optional[Trip]:
        return self.db.scalar(
            select(Trip)
            .join(Trip.memberships)
            .options(*self._member_options())
            .where(Trip.id == trip_id, TripMembership.user_id == user_id)
        )

    def get_by_id_and_owner(self, trip_id: int, user_id: int) -> Optional[Trip]:
        return self.db.scalar(
            select(Trip)
            .options(*self._member_options())
            .where(Trip.id == trip_id, Trip.user_id == user_id)
        )

    def get_all_by_user(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Trip]:
        return list(
            self.db.scalars(
                select(Trip)
                .join(Trip.memberships)
                .options(*self._list_options())
                .where(TripMembership.user_id == user_id)
                .offset(skip)
                .limit(limit)
            ).unique().all()
        )

    def get_all_by_user_lite(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Trip]:
        return list(
            self.db.scalars(
                select(Trip)
                .join(Trip.memberships)
                .where(TripMembership.user_id == user_id)
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_all_by_user_with_planning(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Trip]:
        return list(
            self.db.scalars(
                select(Trip)
                .options(
                    *self._member_options(),
                    selectinload(Trip.memberships)
                    .selectinload(TripMembership.member_state)
                    .selectinload(TripMemberState.packing_items),
                    selectinload(Trip.memberships)
                    .selectinload(TripMembership.member_state)
                    .selectinload(TripMemberState.budget_expenses),
                    selectinload(Trip.memberships)
                    .selectinload(TripMembership.member_state)
                    .selectinload(TripMemberState.prep_items),
                    selectinload(Trip.reservations),
                )
                .join(Trip.memberships)
                .where(TripMembership.user_id == user_id)
                .offset(skip)
                .limit(limit)
            ).unique().all()
        )

    def get_summaries_by_user(self, user_id: int, today: date, skip: int = 0, limit: int = 100) -> list[dict[str, object]]:
        start_of_today = datetime.combine(today, time.min)
        packing_total_sq = (
            select(func.count(PackingItem.id))
            .where(PackingItem.member_state_id == TripMemberState.id)
            .scalar_subquery()
        )
        packing_checked_sq = (
            select(func.count(PackingItem.id))
            .where(
                PackingItem.member_state_id == TripMemberState.id,
                PackingItem.checked.is_(True),
            )
            .scalar_subquery()
        )
        reservation_count_sq = (
            select(func.count(Reservation.id))
            .where(Reservation.trip_id == Trip.id)
            .scalar_subquery()
        )
        reservation_upcoming_count_sq = (
            select(func.count(Reservation.id))
            .where(
                Reservation.trip_id == Trip.id,
                Reservation.start_at.isnot(None),
                Reservation.start_at >= start_of_today,
            )
            .scalar_subquery()
        )
        prep_total_sq = (
            select(func.count(PrepItem.id))
            .where(PrepItem.member_state_id == TripMemberState.id)
            .scalar_subquery()
        )
        prep_completed_sq = (
            select(func.count(PrepItem.id))
            .where(
                PrepItem.member_state_id == TripMemberState.id,
                PrepItem.completed.is_(True),
            )
            .scalar_subquery()
        )
        prep_overdue_sq = (
            select(func.count(PrepItem.id))
            .where(
                PrepItem.member_state_id == TripMemberState.id,
                PrepItem.completed.is_(False),
                PrepItem.due_date.isnot(None),
                PrepItem.due_date < today,
            )
            .scalar_subquery()
        )
        budget_total_spent_sq = (
            select(func.coalesce(func.sum(BudgetExpense.amount), 0.0))
            .where(BudgetExpense.member_state_id == TripMemberState.id)
            .scalar_subquery()
        )
        budget_expense_count_sq = (
            select(func.count(BudgetExpense.id))
            .where(BudgetExpense.member_state_id == TripMemberState.id)
            .scalar_subquery()
        )

        rows = self.db.execute(
            select(
                Trip.id.label("trip_id"),
                TripMemberState.budget_limit,
                packing_total_sq.label("packing_total"),
                packing_checked_sq.label("packing_checked"),
                reservation_count_sq.label("reservation_count"),
                reservation_upcoming_count_sq.label("reservation_upcoming_count"),
                prep_total_sq.label("prep_total"),
                prep_completed_sq.label("prep_completed"),
                prep_overdue_sq.label("prep_overdue_count"),
                budget_total_spent_sq.label("budget_total_spent"),
                budget_expense_count_sq.label("budget_expense_count"),
            )
            .join(
                TripMembership,
                and_(TripMembership.trip_id == Trip.id, TripMembership.user_id == user_id),
            )
            .join(TripMemberState, TripMemberState.membership_id == TripMembership.id)
            .offset(skip)
            .limit(limit)
        ).all()

        return [dict(row._mapping) for row in rows]

    def update(self, trip: Trip, update_data: dict) -> Trip:
        for key, value in update_data.items():
            setattr(trip, key, value)
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def delete_workspace(self, trip: Trip) -> None:
        request_ids = select(MatchRequest.id).where(MatchRequest.trip_id == trip.id)
        result_ids = select(MatchResult.id).where(
            or_(
                MatchResult.request_a_id.in_(request_ids),
                MatchResult.request_b_id.in_(request_ids),
            )
        )

        self.db.execute(
            delete(MatchInteraction).where(
                or_(
                    MatchInteraction.request_id.in_(request_ids),
                    MatchInteraction.match_result_id.in_(result_ids),
                )
            )
        )
        self.db.execute(
            delete(MatchResult).where(
                or_(
                    MatchResult.request_a_id.in_(request_ids),
                    MatchResult.request_b_id.in_(request_ids),
                )
            )
        )
        self.db.execute(delete(MatchRequest).where(MatchRequest.id.in_(request_ids)))
        self.db.execute(delete(TripExecutionEvent).where(TripExecutionEvent.trip_id == trip.id))
        self.db.delete(trip)
        self.db.commit()

    def set_discoverable_for_user(self, user_id: int, is_discoverable: bool) -> None:
        trips = list(
            self.db.scalars(
                select(Trip).where(Trip.user_id == user_id)
            ).all()
        )
        for trip in trips:
            trip.is_discoverable = is_discoverable
        self.db.commit()

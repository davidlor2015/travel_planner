# Path: app/repositories/trip_membership_repository.py
# Summary: Implements data access for trip membership repository operations.

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.trip import Trip
from app.models.trip_membership import TripMembership, TripMemberState
from app.repositories.base import BaseRepository


class TripMembershipRepository(BaseRepository[TripMembership]):
    def __init__(self, db: Session):
        super().__init__(TripMembership, db)

    def get_context(self, trip_id: int, user_id: int) -> Optional[TripMembership]:
        return self.db.scalar(
            select(TripMembership)
            .options(
                joinedload(TripMembership.trip).joinedload(Trip.memberships).joinedload(TripMembership.user),
                joinedload(TripMembership.member_state),
            )
            .where(
                TripMembership.trip_id == trip_id,
                TripMembership.user_id == user_id,
            )
        )

    def get_access_context(self, trip_id: int, user_id: int) -> Optional[TripMembership]:
        return self.db.scalar(
            select(TripMembership)
            .options(
                joinedload(TripMembership.trip),
                joinedload(TripMembership.member_state),
            )
            .where(
                TripMembership.trip_id == trip_id,
                TripMembership.user_id == user_id,
            )
        )

    def get_access_context_with_trip_members(self, trip_id: int, user_id: int) -> Optional[TripMembership]:
        return self.db.scalar(
            select(TripMembership)
            .options(
                selectinload(TripMembership.trip)
                .selectinload(Trip.memberships)
                .selectinload(TripMembership.user),
                joinedload(TripMembership.member_state),
            )
            .where(
                TripMembership.trip_id == trip_id,
                TripMembership.user_id == user_id,
            )
        )

    def get_by_trip_and_user(self, trip_id: int, user_id: int) -> Optional[TripMembership]:
        return self.db.scalar(
            select(TripMembership).where(
                TripMembership.trip_id == trip_id,
                TripMembership.user_id == user_id,
            )
        )

    def list_by_trip(self, trip_id: int) -> list[TripMembership]:
        return list(
            self.db.scalars(
                select(TripMembership)
                .options(joinedload(TripMembership.user), joinedload(TripMembership.member_state))
                .where(TripMembership.trip_id == trip_id)
                .order_by(TripMembership.created_at.asc())
            ).unique().all()
        )

    def list_with_planning_by_trip(self, trip_id: int) -> list[TripMembership]:
        return list(
            self.db.scalars(
                select(TripMembership)
                .options(
                    selectinload(TripMembership.user),
                    selectinload(TripMembership.member_state).selectinload(TripMemberState.packing_items),
                    selectinload(TripMembership.member_state).selectinload(TripMemberState.budget_expenses),
                    selectinload(TripMembership.member_state).selectinload(TripMemberState.prep_items),
                )
                .where(TripMembership.trip_id == trip_id)
                .order_by(TripMembership.created_at.asc())
            ).unique().all()
        )

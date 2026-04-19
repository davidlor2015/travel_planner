from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.trip import Trip
from app.models.trip_membership import TripMemberState, TripMembership
from app.repositories.trip_membership_repository import TripMembershipRepository


@dataclass
class TripAccessContext:
    trip: Trip
    membership: TripMembership
    member_state: TripMemberState


class TripAccessService:
    def __init__(self, db: Session):
        self.membership_repo = TripMembershipRepository(db)

    def require_membership(
        self,
        trip_id: int,
        user_id: int,
        *,
        owner_only: bool = False,
    ) -> TripAccessContext:
        membership = self.membership_repo.get_context(trip_id, user_id)
        if membership is None or membership.member_state is None:
            raise HTTPException(status_code=404, detail="Trip not found")

        if owner_only and membership.role != "owner":
            raise HTTPException(status_code=403, detail="Only the trip owner can perform this action")

        return TripAccessContext(
            trip=membership.trip,
            membership=membership,
            member_state=membership.member_state,
        )

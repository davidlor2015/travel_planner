# Path: app/repositories/trip_invite_repository.py
# Summary: Implements data access for trip invite repository operations.

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.trip_invite import TripInvite
from app.repositories.base import BaseRepository


class TripInviteRepository(BaseRepository[TripInvite]):
    def __init__(self, db: Session):
        super().__init__(TripInvite, db)

    def list_by_trip(self, trip_id: int) -> list[TripInvite]:
        return list(
            self.db.scalars(
                select(TripInvite)
                .where(TripInvite.trip_id == trip_id)
                .order_by(TripInvite.created_at.asc())
            ).all()
        )

    def get_by_token_hash(self, token_hash: str) -> TripInvite | None:
        return self.db.scalar(
            select(TripInvite)
            .options(joinedload(TripInvite.trip))
            .where(TripInvite.token_hash == token_hash)
        )

    def get_pending_by_trip_and_email(self, trip_id: int, email: str) -> TripInvite | None:
        return self.db.scalar(
            select(TripInvite).where(
                TripInvite.trip_id == trip_id,
                TripInvite.email == email.lower(),
                TripInvite.status == "pending",
            )
        )

    def expire_stale_invite(self, invite: TripInvite) -> TripInvite:
        expires_at = invite.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if invite.status == "pending" and expires_at <= datetime.now(timezone.utc):
            invite.status = "expired"
            invite.responded_at = invite.responded_at or datetime.now(timezone.utc)
            self.db.flush()
        return invite

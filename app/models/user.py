from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    trips: Mapped[list["Trip"]] = relationship(
        "Trip",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    trip_memberships: Mapped[list["TripMembership"]] = relationship(
        "TripMembership",
        foreign_keys="TripMembership.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    trip_invites_sent: Mapped[list["TripInvite"]] = relationship(
        "TripInvite",
        foreign_keys="TripInvite.invited_by_user_id",
        back_populates="invited_by",
    )
    trip_invites_accepted: Mapped[list["TripInvite"]] = relationship(
        "TripInvite",
        foreign_keys="TripInvite.accepted_by_user_id",
        back_populates="accepted_by",
    )
    sent_match_requests: Mapped[list["MatchRequest"]] = relationship(
        "MatchRequest",
        back_populates="sender",
        foreign_keys="MatchRequest.sender_id",
    )
    received_match_requests: Mapped[list["MatchRequest"]] = relationship(
        "MatchRequest",
        back_populates="receiver",
        foreign_keys="MatchRequest.receiver_id",
    )
    match_interactions: Mapped[list["MatchInteraction"]] = relationship(
        "MatchInteraction",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    travel_profile: Mapped["TravelProfile"] = relationship(
        "TravelProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        single_parent=True,
    )

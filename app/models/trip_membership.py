from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class TripMembership(Base):
    __tablename__ = "trip_memberships"
    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", name="uq_trip_memberships_trip_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    added_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    trip: Mapped["Trip"] = relationship("Trip", back_populates="memberships")
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="trip_memberships",
    )
    added_by: Mapped["User | None"] = relationship("User", foreign_keys=[added_by_user_id])
    member_state: Mapped["TripMemberState"] = relationship(
        "TripMemberState",
        back_populates="membership",
        cascade="all, delete-orphan",
        uselist=False,
        single_parent=True,
    )

    @property
    def email(self) -> str:
        return self.user.email

    @property
    def joined_at(self) -> datetime:
        return self.created_at


class TripMemberState(Base):
    __tablename__ = "trip_member_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    membership_id: Mapped[int] = mapped_column(
        ForeignKey("trip_memberships.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    budget_limit: Mapped[float | None] = mapped_column(Float, nullable=True)

    membership: Mapped[TripMembership] = relationship(
        "TripMembership", back_populates="member_state"
    )
    packing_items: Mapped[list["PackingItem"]] = relationship(
        "PackingItem",
        back_populates="member_state",
        cascade="all, delete-orphan",
        order_by="PackingItem.created_at",
    )
    budget_expenses: Mapped[list["BudgetExpense"]] = relationship(
        "BudgetExpense",
        back_populates="member_state",
        cascade="all, delete-orphan",
        order_by="BudgetExpense.created_at",
    )
    prep_items: Mapped[list["PrepItem"]] = relationship(
        "PrepItem",
        back_populates="member_state",
        cascade="all, delete-orphan",
        order_by="PrepItem.created_at",
    )

    @property
    def trip_id(self) -> int:
        return self.membership.trip_id

    @property
    def user_id(self) -> int:
        return self.membership.user_id

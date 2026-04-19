from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class BudgetExpense(Base):
    __tablename__ = "budget_expenses"
    __table_args__ = (
        UniqueConstraint(
            "member_state_id",
            "reservation_id",
            name="uq_budget_expenses_member_state_reservation",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    member_state_id: Mapped[int] = mapped_column(
        ForeignKey("trip_member_states.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reservation_id: Mapped[int | None] = mapped_column(
        ForeignKey("reservations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member_state: Mapped["TripMemberState"] = relationship(
        "TripMemberState", back_populates="budget_expenses"
    )
    reservation: Mapped[Optional["Reservation"]] = relationship(
        "Reservation", back_populates="budget_expenses"
    )

    @property
    def trip_id(self) -> int:
        return self.member_state.trip_id

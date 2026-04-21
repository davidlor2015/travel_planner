from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class PrepItem(Base):
    __tablename__ = "prep_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    member_state_id: Mapped[int] = mapped_column(
        ForeignKey("trip_member_states.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    prep_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member_state: Mapped["TripMemberState"] = relationship(
        "TripMemberState", back_populates="prep_items"
    )

    @property
    def trip_id(self) -> int:
        return self.member_state.trip_id

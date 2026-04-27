# Path: app/models/packing_item.py
# Summary: Defines the packing item data model.

from __future__ import annotations

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class PackingItem(Base):
    __tablename__ = "packing_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    member_state_id: Mapped[int] = mapped_column(
        ForeignKey("trip_member_states.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member_state: Mapped["TripMemberState"] = relationship(
        "TripMemberState", back_populates="packing_items"
    )

    @property
    def trip_id(self) -> int:
        return self.member_state.trip_id

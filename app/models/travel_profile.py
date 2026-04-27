# Path: app/models/travel_profile.py
# Summary: Defines the travel profile data model.

from __future__ import annotations

from enum import Enum

from sqlalchemy import Boolean, Enum as SQLEnum, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class TravelStyle(str, Enum):
    ADVENTURE = "adventure"
    RELAXED = "relaxed"
    CULTURAL = "cultural"
    PARTY = "party"


class BudgetRange(str, Enum):
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    LUXURY = "luxury"


class TravelProfile(Base):
    __tablename__ = "travel_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    travel_style: Mapped[TravelStyle] = mapped_column(
        SQLEnum(TravelStyle, name="travel_style_enum", native_enum=False),
        nullable=False,
    )
    budget_range: Mapped[BudgetRange] = mapped_column(
        SQLEnum(BudgetRange, name="budget_range_enum", native_enum=False),
        nullable=False,
    )
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    group_size_min: Mapped[int] = mapped_column(Integer, nullable=False)
    group_size_max: Mapped[int] = mapped_column(Integer, nullable=False)
    is_discoverable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="travel_profile")

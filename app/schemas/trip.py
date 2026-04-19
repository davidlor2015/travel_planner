# app/schemas/trip.py
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator


class TripBase(BaseModel):
    """
    Base schema for Trips.

    Used for:
    - TripCreate (all required)
    - TripResponse (all required + id/user_id/created_at)
    """
    title: str
    destination: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        # Create/full objects: both dates exist and must be in order
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class TripCreate(TripBase):
    """Schema for creating a Trip."""
    pass


class TripUpdate(BaseModel):
    """
    Schema for PATCH updates.
    All fields optional because PATCH is partial.
    """
    title: Optional[str] = None
    destination: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date must be on or after start_date")
        return self


class TripMemberResponse(BaseModel):
    user_id: int
    email: EmailStr
    role: str
    joined_at: datetime
    status: str = "active"

    model_config = ConfigDict(from_attributes=True)


class TripMemberAddRequest(BaseModel):
    email: EmailStr


class TripInviteCreateRequest(BaseModel):
    email: EmailStr


class TripInviteResponse(BaseModel):
    id: int
    email: EmailStr
    status: str
    created_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripInviteCreateResponse(TripInviteResponse):
    invite_url: str


class TripInviteAcceptResponse(BaseModel):
    trip_id: int
    trip_title: str
    status: str


class TripInviteDetailResponse(BaseModel):
    trip_id: int
    trip_title: str
    destination: str
    start_date: date
    end_date: date
    email: EmailStr
    status: str
    expires_at: datetime


class TripResponse(TripBase):
    """Schema returned to client."""
    id: int
    user_id: int
    created_at: datetime
    member_count: int
    members: list[TripMemberResponse]
    pending_invites: list[TripInviteResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TripSummaryResponse(BaseModel):
    trip_id: int
    packing_total: int
    packing_checked: int
    packing_progress_pct: int
    reservation_count: int
    reservation_upcoming_count: int
    prep_total: int
    prep_completed: int
    prep_overdue_count: int
    budget_limit: float | None
    budget_total_spent: float
    budget_remaining: float | None
    budget_is_over: bool
    budget_expense_count: int

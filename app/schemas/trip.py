# Path: app/schemas/trip.py
# Summary: Defines Pydantic schemas for trip payloads.

# app/schemas/trip.py
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.core.normalization import normalize_trip_destination


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

    @field_validator("destination", mode="before")
    @classmethod
    def normalize_destination(cls, value: str) -> str:
        if not isinstance(value, str):
            raise TypeError("destination must be a string")
        return normalize_trip_destination(value)

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

    @field_validator("destination", mode="before")
    @classmethod
    def normalize_destination(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return normalize_trip_destination(value)

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
    workspace_last_seen_signature: str | None = None
    workspace_last_seen_snapshot: dict | None = None
    workspace_last_seen_at: datetime | None = None

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
    invited_by_email: EmailStr | None = None


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


class WorkspaceLastSeenUpdateRequest(BaseModel):
    signature: str
    snapshot: dict


class WorkspaceLastSeenResponse(BaseModel):
    workspace_last_seen_signature: str | None = None
    workspace_last_seen_snapshot: dict | None = None
    workspace_last_seen_at: datetime | None = None


class TripMemberReadinessItemResponse(BaseModel):
    user_id: int
    email: EmailStr
    role: str
    readiness_score: int | None = None
    blocker_count: int
    unknown: bool
    status: Literal["unknown", "ready", "needs_attention"]


class TripMemberReadinessResponse(BaseModel):
    generated_at: datetime
    members: list[TripMemberReadinessItemResponse]


OnTripResolutionSource = Literal[
    "day_date_exact",
    "trip_day_offset",
    "itinerary_sequence",
    "ambiguous",
    "none",
]
OnTripResolutionConfidence = Literal["high", "medium", "low"]
OnTripBlockerSeverity = Literal["blocker", "watch"]


ExecutionStatus = Literal["planned", "confirmed", "skipped"]


class TripOnTripStopSnapshotResponse(BaseModel):
    day_number: int | None = None
    day_date: date | None = None
    title: str | None = None
    time: str | None = None
    location: str | None = None
    notes: str | None = None
    lat: float | None = None
    lon: float | None = None
    status: Literal["planned", "confirmed", "skipped"] | None = None
    source: OnTripResolutionSource
    confidence: OnTripResolutionConfidence
    stop_ref: str | None = None
    execution_status: ExecutionStatus | None = None


class TripOnTripUnplannedStopResponse(BaseModel):
    event_id: int
    day_date: date
    time: str | None = None
    title: str
    location: str | None = None
    notes: str | None = None
    created_by_email: EmailStr | None = None


class TripOnTripBlockerResponse(BaseModel):
    id: str
    bucket: Literal["on_trip_execution"] = "on_trip_execution"
    severity: OnTripBlockerSeverity
    title: str
    detail: str
    owner_email: EmailStr | None = None


class TripOnTripSnapshotResponse(BaseModel):
    generated_at: datetime
    mode: Literal["inactive", "active"]
    read_only: bool = True
    today: TripOnTripStopSnapshotResponse
    next_stop: TripOnTripStopSnapshotResponse
    today_stops: list[TripOnTripStopSnapshotResponse] = []
    today_unplanned: list[TripOnTripUnplannedStopResponse] = []
    blockers: list[TripOnTripBlockerResponse]


class TripStopStatusUpdateRequest(BaseModel):
    stop_ref: str
    status: ExecutionStatus


class TripUnplannedStopRequest(BaseModel):
    day_date: date
    title: str
    time: str | None = None
    location: str | None = None
    notes: str | None = None
    # Opaque per-submission idempotency token. When the client supplies one,
    # a replayed POST (retry after a dropped response) must return the
    # originally-persisted row instead of creating a duplicate. Leaving this
    # optional preserves the append-only path for clients that don't send it.
    client_request_id: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("client_request_id", mode="before")
    @classmethod
    def normalize_client_request_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise TypeError("client_request_id must be a string")
        cleaned = value.strip()
        if not cleaned:
            return None
        if len(cleaned) > 64:
            raise ValueError("client_request_id must be at most 64 characters")
        return cleaned


class TripExecutionEventResponse(BaseModel):
    id: int
    kind: Literal["stop_status", "unplanned_stop"]
    stop_ref: str | None = None
    status: ExecutionStatus | None = None
    day_date: date | None = None
    time: str | None = None
    title: str | None = None
    location: str | None = None
    notes: str | None = None
    created_by_user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripExecutionSummaryResponse(BaseModel):
    confirmed_stops_count: int
    skipped_stops_count: int
    unplanned_stops_count: int

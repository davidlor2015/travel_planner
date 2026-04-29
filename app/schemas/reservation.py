# Path: app/schemas/reservation.py
# Summary: Defines Pydantic schemas for reservation payloads.

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


RESERVATION_TYPES = {
    "flight",
    "hotel",
    "train",
    "bus",
    "car",
    "activity",
    "restaurant",
    "other",
}


class ReservationBase(BaseModel):
    title: str
    reservation_type: str
    provider: str | None = None
    confirmation_code: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = None
    notes: str | None = None
    amount: float | None = None
    currency: str | None = None
    sync_to_budget: bool = True

    @field_validator("reservation_type")
    @classmethod
    def validate_reservation_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in RESERVATION_TYPES:
            raise ValueError(f"reservation_type must be one of: {', '.join(sorted(RESERVATION_TYPES))}")
        return normalized

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if len(normalized) != 3:
            raise ValueError("currency must be a 3-letter ISO code")
        return normalized

    @field_validator("title", "provider", "confirmation_code", "location", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_at is not None and self.start_at is not None and self.end_at < self.start_at:
            raise ValueError("end_at must be on or after start_at")
        if self.amount is not None and self.amount < 0:
            raise ValueError("amount must be non-negative")
        return self


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    title: str | None = None
    reservation_type: str | None = None
    provider: str | None = None
    confirmation_code: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = None
    notes: str | None = None
    amount: float | None = None
    currency: str | None = None
    sync_to_budget: bool | None = None

    @field_validator("reservation_type")
    @classmethod
    def validate_reservation_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in RESERVATION_TYPES:
            raise ValueError(f"reservation_type must be one of: {', '.join(sorted(RESERVATION_TYPES))}")
        return normalized

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if len(normalized) != 3:
            raise ValueError("currency must be a 3-letter ISO code")
        return normalized

    @field_validator("title", "provider", "confirmation_code", "location", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_at is not None and self.start_at is not None and self.end_at < self.start_at:
            raise ValueError("end_at must be on or after start_at")
        if self.amount is not None and self.amount < 0:
            raise ValueError("amount must be non-negative")
        return self


class ReservationResponse(BaseModel):
    id: int
    trip_id: int
    title: str
    reservation_type: str
    provider: str | None
    confirmation_code: str | None
    start_at: datetime | None
    end_at: datetime | None
    location: str | None
    notes: str | None
    amount: float | None
    currency: str | None
    budget_expense_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

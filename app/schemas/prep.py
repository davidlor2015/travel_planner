from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


PREP_TYPES = {"document", "booking", "checklist", "health", "other"}


class PrepItemBase(BaseModel):
    title: str
    prep_type: str = "checklist"
    due_date: date | None = None
    notes: str | None = None

    @field_validator("title", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("prep_type")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PREP_TYPES:
            raise ValueError(f"prep_type must be one of: {', '.join(sorted(PREP_TYPES))}")
        return normalized


class PrepItemCreate(PrepItemBase):
    pass


class PrepItemUpdate(BaseModel):
    title: str | None = None
    prep_type: str | None = None
    due_date: date | None = None
    notes: str | None = None
    completed: bool | None = None

    @field_validator("title", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("prep_type")
    @classmethod
    def normalize_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in PREP_TYPES:
            raise ValueError(f"prep_type must be one of: {', '.join(sorted(PREP_TYPES))}")
        return normalized


class PrepItemResponse(BaseModel):
    id: int
    trip_id: int
    title: str
    prep_type: str
    due_date: date | None
    notes: str | None
    completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

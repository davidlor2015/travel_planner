
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Any, Literal

ItineraryStopStatus = Literal["planned", "confirmed", "skipped"]
DayAnchorType = Literal["flight", "hotel_checkin"]


class ItineraryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    time: Optional[str] = Field(None, description="Approximate time, e.g., '09:00AM' or 'Morning'")
    title: str = Field(..., description="Name of the activity")
    location: Optional[str] = None
    lat: Optional[float] = Field(None, description="Latitude of the location")
    lon: Optional[float] = Field(None, description="Longitude of the location")
    notes: Optional[str] = Field(None, description="Short description or tip")
    cost_estimate: Optional[str] = Field(None, description="e.g. '$20' or 'Free'")
    status: Optional[ItineraryStopStatus] = Field(
        None,
        description="Group coordination: planned vs confirmed vs skipped",
    )
    handled_by: Optional[str] = Field(
        None,
        description="Owner for handling this stop (email/identifier).",
    )
    booked_by: Optional[str] = Field(
        None,
        description="Owner for booking this stop (email/identifier).",
    )

    @field_validator("cost_estimate", mode="before")
    @classmethod
    def coerce_cost_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v) if not isinstance(v, str) else v

class DayAnchor(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: DayAnchorType
    label: str
    time: Optional[str] = None
    note: Optional[str] = None
    handled_by: Optional[str] = Field(
        None,
        description="Owner for handling this anchor (email/identifier).",
    )
    booked_by: Optional[str] = Field(
        None,
        description="Owner for booking this anchor (email/identifier).",
    )


class DayPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    day_number: int
    date: Optional[str] = None
    day_title: Optional[str] = None
    day_note: Optional[str] = None
    anchors: List[DayAnchor] = []
    items: List[ItineraryItem] = []

class ItineraryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    title: str = Field(..., description="A catchy title for this itinerary")
    summary: str = Field(..., description="A brief overview of the trip")
    days: List[DayPlan]

    @field_validator("days", mode="before")
    @classmethod
    def filter_invalid_days(cls, v: Any) -> List[Any]:
        if not isinstance(v, list):
            return v
        return [
            item for item in v
            if not isinstance(item, dict) or "day_number" in item
        ]
    budget_breakdown: Optional[dict[str, str]] = Field(None, description="Key-value pairs of budget categories")
    packing_list: Optional[List[str]] = None
    tips: Optional[List[str]] = None

    @field_validator("tips", mode="before")
    @classmethod
    def coerce_tips_to_list(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, str):
            return [v]
        return v

    @field_validator("packing_list", mode="before")
    @classmethod
    def coerce_packing_list_to_list(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, str):
            return [v]
        return v

    @field_validator("budget_breakdown", mode="before")
    @classmethod
    def coerce_budget_values_to_str(cls, v: Any) -> Optional[dict]:
        if v is None:
            return None
        if isinstance(v, dict):
            return {k: str(val) for k, val in v.items()}
        if isinstance(v, str):
            text = v.strip()
            if not text:
                return None
            return {"overview": text}
        return v
    source: str = Field("unknown", description="How this itinerary was generated")
    source_label: str = Field("Unknown source", description="Human-friendly itinerary source label")
    fallback_used: bool = False

class AIPlanRequest(BaseModel):

    trip_id: int

    interests_override: Optional[str] = None
    budget_override: Optional[str] = None

class AIApplyRequest(BaseModel):

    trip_id: int

    itinerary: ItineraryResponse


RefinementVariant = Literal["faster_pace", "cheaper", "more_local", "less_walking"]
RefinementTimeBlock = Literal["morning", "afternoon", "evening"]


class ItineraryItemReference(BaseModel):
    day_number: int
    item_index: int = Field(..., ge=0)


class AIRefineRequest(BaseModel):
    trip_id: int
    current_itinerary: ItineraryResponse
    locked_items: List[ItineraryItemReference] = []
    favorite_items: List[ItineraryItemReference] = []
    regenerate_day_number: Optional[int] = Field(None, ge=1)
    regenerate_time_block: Optional[RefinementTimeBlock] = None
    variant: Optional[RefinementVariant] = None


class AIDayRefinementResponse(BaseModel):
    day: DayPlan



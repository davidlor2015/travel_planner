from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Any, Iterable, Mapping


INTERESTS_WEIGHT = 0.3
TRAVEL_STYLE_WEIGHT = 0.2
BUDGET_WEIGHT = 0.2
GROUP_SIZE_WEIGHT = 0.1
DATE_OVERLAP_WEIGHT = 0.2

_BUDGET_ORDER = {
    "budget": 0,
    "low": 0,
    "mid_range": 1,
    "medium": 1,
    "luxury": 2,
    "high": 2,
}


@dataclass(frozen=True)
class ScoreBreakdown:
    destination_score: float
    date_overlap_score: float
    budget_score: float
    interest_score: float
    group_size_score: float
    travel_style_score: float
    total_weighted_score: float

    def to_dict(self) -> dict[str, float]:
        return asdict(self)


def _normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _trip_duration_in_days(start: date, end: date) -> int:
    return max((end - start).days + 1, 1)


def _extract_group_size_range(profile: Any) -> tuple[int | None, int | None]:
    if isinstance(profile, Mapping):
        return profile.get("group_size_min"), profile.get("group_size_max")

    return getattr(profile, "group_size_min", None), getattr(profile, "group_size_max", None)


def destination_score(a: str | None, b: str | None) -> float:
    return 1.0 if _normalize_text(a) == _normalize_text(b) and _normalize_text(a) else 0.0


def date_overlap_score(start_a: date, end_a: date, start_b: date, end_b: date) -> float:
    overlap_start = max(start_a, start_b)
    overlap_end = min(end_a, end_b)

    if overlap_end < overlap_start:
        return 0.0

    overlap_days = (overlap_end - overlap_start).days + 1
    shorter_trip_duration = min(
        _trip_duration_in_days(start_a, end_a),
        _trip_duration_in_days(start_b, end_b),
    )
    return _clamp(overlap_days / shorter_trip_duration)


def budget_score(a: str | None, b: str | None) -> float:
    budget_a = _normalize_text(a)
    budget_b = _normalize_text(b)

    if budget_a == budget_b and budget_a in _BUDGET_ORDER:
        return 1.0
    if budget_a not in _BUDGET_ORDER or budget_b not in _BUDGET_ORDER:
        return 0.0
    if abs(_BUDGET_ORDER[budget_a] - _BUDGET_ORDER[budget_b]) == 1:
        return 0.5
    return 0.0


def interest_score(set_a: Iterable[str] | None, set_b: Iterable[str] | None) -> float:
    interests_a = {_normalize_text(item) for item in (set_a or []) if _normalize_text(item)}
    interests_b = {_normalize_text(item) for item in (set_b or []) if _normalize_text(item)}

    union = interests_a | interests_b
    if not union:
        return 0.0

    intersection = interests_a & interests_b
    return len(intersection) / len(union)


def group_size_score(profile_a: Any, profile_b: Any) -> float:
    min_a, max_a = _extract_group_size_range(profile_a)
    min_b, max_b = _extract_group_size_range(profile_b)

    if None in (min_a, max_a, min_b, max_b):
        return 0.0

    overlap_min = max(min_a, min_b)
    overlap_max = min(max_a, max_b)
    return 1.0 if overlap_min <= overlap_max else 0.0


def travel_style_score(a: str | None, b: str | None) -> float:
    return 1.0 if _normalize_text(a) == _normalize_text(b) and _normalize_text(a) else 0.0


def calculate_compatibility(
    *,
    destination_a: str | None,
    destination_b: str | None,
    start_a: date,
    end_a: date,
    start_b: date,
    end_b: date,
    budget_a: str | None,
    budget_b: str | None,
    interests_a: Iterable[str] | None,
    interests_b: Iterable[str] | None,
    profile_a: Mapping[str, Any] | Any,
    profile_b: Mapping[str, Any] | Any,
    travel_style_a: str | None,
    travel_style_b: str | None,
) -> ScoreBreakdown:
    destination = destination_score(destination_a, destination_b)
    date_overlap = date_overlap_score(start_a, end_a, start_b, end_b)
    budget = budget_score(budget_a, budget_b)
    interests = interest_score(interests_a, interests_b)
    group_size = group_size_score(profile_a, profile_b)
    travel_style = travel_style_score(travel_style_a, travel_style_b)

    total_weighted_score = _clamp(
        (interests * INTERESTS_WEIGHT)
        + (travel_style * TRAVEL_STYLE_WEIGHT)
        + (budget * BUDGET_WEIGHT)
        + (group_size * GROUP_SIZE_WEIGHT)
        + (date_overlap * DATE_OVERLAP_WEIGHT)
    )

    return ScoreBreakdown(
        destination_score=destination,
        date_overlap_score=date_overlap,
        budget_score=budget,
        interest_score=interests,
        group_size_score=group_size,
        travel_style_score=travel_style,
        total_weighted_score=total_weighted_score,
    )

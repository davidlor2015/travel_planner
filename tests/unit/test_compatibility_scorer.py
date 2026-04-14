"""
Unit tests for the pure compatibility scoring helpers:
  - Destination matching
  - Date overlap calculations
  - Budget tier comparisons
  - Interest Jaccard similarity
  - Group size compatibility
  - Structured weighted score output
"""

from datetime import date

import pytest

from app.services.compatibility_scorer import (
    ScoreBreakdown,
    budget_score,
    calculate_compatibility,
    date_overlap_score,
    destination_score,
    group_size_score,
    interest_score,
)


def test_destination_score_returns_one_for_exact_case_insensitive_match():
    assert destination_score("Paris", "paris") == 1.0


def test_date_overlap_score_returns_zero_for_non_overlapping_ranges():
    score = date_overlap_score(
        date(2025, 6, 1),
        date(2025, 6, 3),
        date(2025, 6, 10),
        date(2025, 6, 12),
    )

    assert score == 0.0


def test_date_overlap_score_returns_fraction_for_partial_overlap():
    score = date_overlap_score(
        date(2025, 6, 1),
        date(2025, 6, 5),
        date(2025, 6, 3),
        date(2025, 6, 6),
    )

    assert score == pytest.approx(0.75)


def test_interest_score_returns_one_for_identical_interest_sets():
    score = interest_score({"Food", "Museums"}, {"food", "museums"})

    assert score == 1.0


def test_interest_score_returns_zero_for_disjoint_interest_sets():
    score = interest_score({"Food", "Museums"}, {"Hiking", "Nightlife"})

    assert score == 0.0


def test_budget_score_returns_half_for_adjacent_budget_tiers():
    assert budget_score("low", "medium") == 0.5


def test_group_size_score_returns_zero_for_non_overlapping_ranges():
    score = group_size_score(
        {"group_size_min": 1, "group_size_max": 2},
        {"group_size_min": 4, "group_size_max": 6},
    )

    assert score == 0.0


def test_calculate_compatibility_returns_structured_breakdown():
    result = calculate_compatibility(
        destination_a="Paris",
        destination_b="paris",
        start_a=date(2025, 6, 1),
        end_a=date(2025, 6, 5),
        start_b=date(2025, 6, 3),
        end_b=date(2025, 6, 6),
        budget_a="low",
        budget_b="medium",
        interests_a={"food", "art"},
        interests_b={"art", "nature"},
        profile_a={"group_size_min": 2, "group_size_max": 4},
        profile_b={"group_size_min": 4, "group_size_max": 6},
        travel_style_a="balanced",
        travel_style_b="balanced",
    )

    assert isinstance(result, ScoreBreakdown)
    assert result.destination_score == 1.0
    assert result.date_overlap_score == pytest.approx(0.75)
    assert result.budget_score == 0.5
    assert result.interest_score == pytest.approx(1 / 3)
    assert result.group_size_score == 1.0
    assert result.travel_style_score == 1.0
    assert result.total_weighted_score == pytest.approx(0.65)

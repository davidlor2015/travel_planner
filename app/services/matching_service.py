from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.match_request import MatchRequest, MatchRequestStatus
from app.models.match_result import MatchResult
from app.models.travel_profile import TravelProfile
from app.models.trip import Trip
from app.repositories.match_request_repository import MatchRequestRepository
from app.repositories.match_result_repository import MatchResultRepository
from app.repositories.travel_profile_repository import TravelProfileRepository
from app.repositories.trip_repository import TripRepository
from app.services.compatibility_scorer import calculate_compatibility


class MatchingService:
    MIN_MATCH_SCORE = 0.20

    def __init__(self, db: Session):
        self.db = db
        self.trip_repo = TripRepository(db)
        self.profile_repo = TravelProfileRepository(db)
        self.request_repo = MatchRequestRepository(db)
        self.result_repo = MatchResultRepository(db)

    def _enum_value(self, value: Any) -> Any:
        return value.value if isinstance(value, Enum) else value

    def _get_user_request(self, user_id: int, request_id: int) -> MatchRequest:
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Match request not found")
        if request.sender_id != user_id and request.receiver_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this match request")
        return request

    def _invalidate(self, user_id: int) -> None:
        self.result_repo.delete_by_user(user_id)

    def _get_duplicate_open_request(self, user_id: int, trip_id: int) -> MatchRequest | None:
        for request in self.request_repo.get_open_for_trip(trip_id):
            if (
                request.sender_id == user_id
                and request.receiver_id == user_id
                and request.status == MatchRequestStatus.OPEN
            ):
                return request
        return None

    def _get_or_create_candidate_request(self, source_trip: Trip, candidate_trip: Trip) -> MatchRequest:
        for request in self.request_repo.get_open_for_trip(candidate_trip.id):
            if (
                request.sender_id == candidate_trip.user_id
                and request.status == MatchRequestStatus.OPEN
            ):
                return request

        candidate_request = MatchRequest(
            sender_id=candidate_trip.user_id,
            receiver_id=candidate_trip.user_id,
            trip_id=candidate_trip.id,
            status=MatchRequestStatus.OPEN,
        )
        return self.request_repo.add(candidate_request)

    def _serialize_request(self, request: MatchRequest) -> dict[str, object]:
        status = request.status.value if isinstance(request.status, Enum) else str(request.status)
        if status not in {"open", "closed"}:
            status = "closed"
        return {
            "id": request.id,
            "trip_id": request.trip_id,
            "user_id": request.sender_id,
            "status": status,
            "created_at": request.created_at,
        }

    def _serialize_breakdown(self, breakdown: dict[str, Any]) -> dict[str, float]:
        return {
            "destination": float(breakdown.get("destination_score", 0.0)),
            "date_overlap": float(breakdown.get("date_overlap_score", 0.0)),
            "travel_style": float(breakdown.get("travel_style_score", 0.0)),
            "budget": float(breakdown.get("budget_score", 0.0)),
            "interests": float(breakdown.get("interest_score", 0.0)),
            "group_size": float(breakdown.get("group_size_score", 0.0)),
        }

    def _serialize_result(self, request_id: int, result: MatchResult) -> dict[str, object]:
        other_request = result.request_b if result.request_a_id == request_id else result.request_a
        matched_trip = other_request.trip
        matched_user = other_request.sender

        return {
            "score": result.score,
            "breakdown": self._serialize_breakdown(result.breakdown),
            "matched_trip": {
                "id": matched_trip.id,
                "destination": matched_trip.destination,
                "start_date": matched_trip.start_date,
                "end_date": matched_trip.end_date,
            },
            "matched_user": {
                "id": matched_user.id,
                "email": matched_user.email,
            },
        }

    def _build_match_result(
        self,
        source_request: MatchRequest,
        source_trip: Trip,
        source_profile: TravelProfile,
        candidate_trip: Trip,
    ) -> MatchResult | None:
        candidate_profile = candidate_trip.owner.travel_profile
        if candidate_profile is None:
            return None

        breakdown = calculate_compatibility(
            destination_a=source_trip.destination,
            destination_b=candidate_trip.destination,
            start_a=source_trip.start_date,
            end_a=source_trip.end_date,
            start_b=candidate_trip.start_date,
            end_b=candidate_trip.end_date,
            budget_a=self._enum_value(source_profile.budget_range),
            budget_b=self._enum_value(candidate_profile.budget_range),
            interests_a=source_profile.interests,
            interests_b=candidate_profile.interests,
            profile_a=source_profile,
            profile_b=candidate_profile,
            travel_style_a=self._enum_value(source_profile.travel_style),
            travel_style_b=self._enum_value(candidate_profile.travel_style),
        )

        if breakdown.total_weighted_score < self.MIN_MATCH_SCORE:
            return None

        candidate_request = self._get_or_create_candidate_request(source_trip, candidate_trip)
        return MatchResult(
            request_a_id=source_request.id,
            request_b_id=candidate_request.id,
            score=breakdown.total_weighted_score,
            breakdown=breakdown.to_dict(),
        )

    def open_request(self, user_id: int, trip_id: int) -> dict[str, object]:
        trip = self.trip_repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        profile = self.profile_repo.get_by_user(user_id)
        if not profile:
            raise HTTPException(status_code=422, detail="Travel profile required")

        duplicate_request = self._get_duplicate_open_request(user_id, trip_id)
        if duplicate_request:
            raise HTTPException(status_code=409, detail="Open match request already exists for trip")

        request = MatchRequest(
            sender_id=user_id,
            receiver_id=user_id,
            trip_id=trip.id,
            status=MatchRequestStatus.OPEN,
        )
        request = self.request_repo.add(request)

        candidates = self.request_repo.get_open_candidates(
            excluding_user_id=user_id,
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
        )

        match_results: list[MatchResult] = []
        for candidate_trip in candidates:
            result = self._build_match_result(request, trip, profile, candidate_trip)
            if result is not None:
                match_results.append(result)

        saved_results = self.result_repo.bulk_upsert(match_results)
        return {
            "request": self._serialize_request(request),
            "results": [self._serialize_result(request.id, result) for result in saved_results],
        }

    def get_matches(
        self,
        user_id: int,
        request_id: int,
        min_score: float = 0.0,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, object]]:
        request = self._get_user_request(user_id, request_id)
        results = self.result_repo.get_by_request(
            request_id=request_id,
            min_score=min_score,
            limit=limit,
            offset=offset,
        )
        return [self._serialize_result(request.id, result) for result in results]

    def list_requests(self, user_id: int) -> list[dict[str, object]]:
        requests = [
            request
            for request in self.request_repo.list_by_user(user_id)
            if request.sender_id == user_id and request.receiver_id == user_id
        ]
        return [self._serialize_request(request) for request in requests]

    def delete_request(self, user_id: int, request_id: int) -> None:
        request = self._get_user_request(user_id, request_id)
        self.result_repo.delete_by_request(request_id)
        request.status = MatchRequestStatus.CLOSED
        self.db.commit()
        self.db.refresh(request)

# Path: app/services/travel_profile_service.py
# Summary: Implements travel profile service business logic.

from fastapi import HTTPException
from typing import Any

from sqlalchemy.orm import Session

from app.models.travel_profile import TravelProfile
from app.repositories.travel_profile_repository import TravelProfileRepository
from app.repositories.trip_repository import TripRepository
from app.services.matching_service import MatchingService


class TravelProfileService:
    def __init__(self, db: Session):
        self.repo = TravelProfileRepository(db)
        self.trip_repo = TripRepository(db)
        self.matching_service = MatchingService(db)

    def get_by_user(self, user_id: int) -> TravelProfile | None:
        return self.repo.get_by_user(user_id)

    def get_one(self, user_id: int) -> TravelProfile:
        profile = self.get_by_user(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Travel profile not found")
        return profile

    def upsert(self, user_id: int, data: dict[str, Any]) -> TravelProfile:
        profile = self.repo.upsert(user_id, data)
        self.trip_repo.set_discoverable_for_user(user_id, profile.is_discoverable)
        self.matching_service._invalidate(user_id)
        return profile

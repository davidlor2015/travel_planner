from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories.trip_repository import TripRepository
from app.repositories.travel_profile_repository import TravelProfileRepository
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripUpdate
from app.services.matching_service import MatchingService


class TripService:
    def __init__(self, db: Session):
        self.repo = TripRepository(db)
        self.profile_repo = TravelProfileRepository(db)
        self.matching_service = MatchingService(db)

    def create(self, trip_in: TripCreate, user_id: int) -> Trip:
        profile = self.profile_repo.get_by_user(user_id)
        trip = Trip(
            **trip_in.model_dump(),
            user_id=user_id,
            is_discoverable=profile.is_discoverable if profile else True,
        )
        return self.repo.add(trip)

    def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> list[Trip]:
        return self.repo.get_all_by_user(user_id, skip, limit)

    def get_one(self, trip_id: int, user_id: int) -> Trip:
        trip = self.repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        return trip

    def update(self, trip_id: int, user_id: int, trip_in: TripUpdate) -> Trip:
        trip = self.get_one(trip_id, user_id)
        updated_trip = self.repo.update(trip, trip_in.model_dump(exclude_unset=True))
        self.matching_service._invalidate(user_id)
        return updated_trip

    def delete(self, trip_id: int, user_id: int) -> None:
        trip = self.get_one(trip_id, user_id)
        self.repo.delete(trip)
        self.matching_service._invalidate(user_id)

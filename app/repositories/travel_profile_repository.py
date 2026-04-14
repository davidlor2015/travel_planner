from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.travel_profile import TravelProfile
from app.repositories.base import BaseRepository


class TravelProfileRepository(BaseRepository[TravelProfile]):
    def __init__(self, db: Session):
        super().__init__(TravelProfile, db)

    def get_by_user(self, user_id: int) -> Optional[TravelProfile]:
        return self.db.scalar(select(TravelProfile).where(TravelProfile.user_id == user_id))

    def upsert(self, user_id: int, data: dict[str, Any]) -> TravelProfile:
        profile = self.get_by_user(user_id)

        if profile is None:
            profile = TravelProfile(user_id=user_id, **data)
            return self.add(profile)

        for key, value in data.items():
            setattr(profile, key, value)

        self.db.commit()
        self.db.refresh(profile)
        return profile

from datetime import date
from typing import List

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, contains_eager

from app.models.match_request import MatchRequest, MatchRequestStatus
from app.models.trip import Trip
from app.models.user import User
from app.repositories.base import BaseRepository


class MatchRequestRepository(BaseRepository[MatchRequest]):
    def __init__(self, db: Session):
        super().__init__(MatchRequest, db)

    def get_open_for_trip(self, trip_id: int) -> List[MatchRequest]:
        return list(
            self.db.scalars(
                select(MatchRequest)
                .where(
                    MatchRequest.trip_id == trip_id,
                    MatchRequest.status == MatchRequestStatus.OPEN,
                )
                .order_by(MatchRequest.created_at.desc())
            ).all()
        )

    def list_by_user(self, user_id: int) -> List[MatchRequest]:
        return list(
            self.db.scalars(
                select(MatchRequest)
                .where(
                    or_(
                        MatchRequest.sender_id == user_id,
                        MatchRequest.receiver_id == user_id,
                    )
                )
                .order_by(MatchRequest.created_at.desc())
            ).all()
        )

    def get_open_candidates(
        self,
        excluding_user_id: int,
        destination: str,
        start_date: date,
        end_date: date,
    ) -> List[Trip]:
        return list(
            self.db.scalars(
                select(Trip)
                .join(Trip.owner)
                .join(User.travel_profile)
                .options(
                    contains_eager(Trip.owner).contains_eager(User.travel_profile)
                )
                .where(
                    Trip.is_discoverable.is_(True),
                    Trip.user_id != excluding_user_id,
                    func.lower(Trip.destination) == destination.strip().lower(),
                    Trip.start_date <= end_date,
                    Trip.end_date >= start_date,
                )
                .order_by(Trip.start_date.asc(), Trip.id.asc())
            ).unique().all()
        )

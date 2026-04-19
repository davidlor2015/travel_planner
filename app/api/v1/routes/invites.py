from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.schemas.trip import TripInviteAcceptResponse, TripInviteDetailResponse
from app.services.trip_service import TripService

router = APIRouter()


@router.get("/{token}", response_model=TripInviteDetailResponse)
def get_trip_invite(token: str, db: SessionDep):
    return TripService(db).get_invite_detail(token)


@router.post("/{token}/accept", response_model=TripInviteAcceptResponse)
def accept_trip_invite(token: str, db: SessionDep, current_user: CurrentUser):
    return TripService(db).accept_invite(token, current_user.id)

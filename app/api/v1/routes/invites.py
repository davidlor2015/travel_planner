# Path: app/api/v1/routes/invites.py
# Summary: Defines invites API route handlers.

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.schemas.trip import (
    TripInviteAcceptResponse,
    TripInviteDetailResponse,
    TripInvitePendingResponse,
)
from app.services.trip_service import TripService

router = APIRouter()


@router.get("/pending", response_model=list[TripInvitePendingResponse])
def list_pending_trip_invites(db: SessionDep, current_user: CurrentUser):
    return TripService(db).list_pending_invites_for_user(current_user.id)


@router.post("/pending/{invite_id}/accept", response_model=TripInviteAcceptResponse)
def accept_pending_trip_invite(invite_id: int, db: SessionDep, current_user: CurrentUser):
    return TripService(db).accept_pending_invite_by_id(invite_id, current_user.id)


@router.post("/pending/{invite_id}/decline", response_model=TripInviteAcceptResponse)
def decline_pending_trip_invite(invite_id: int, db: SessionDep, current_user: CurrentUser):
    return TripService(db).decline_pending_invite_by_id(invite_id, current_user.id)


@router.get("/{token}", response_model=TripInviteDetailResponse)
def get_trip_invite(token: str, db: SessionDep):
    return TripService(db).get_invite_detail(token)


@router.post("/{token}/accept", response_model=TripInviteAcceptResponse)
def accept_trip_invite(token: str, db: SessionDep, current_user: CurrentUser):
    return TripService(db).accept_invite(token, current_user.id)


@router.post("/{token}/decline", response_model=TripInviteAcceptResponse)
def decline_trip_invite(token: str, db: SessionDep, current_user: CurrentUser):
    return TripService(db).decline_invite(token, current_user.id)

# Path: app/api/v1/routes/trips.py
# Summary: Defines trips API route handlers.

from typing import List
from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
from app.schemas.trip import (
    TripCreate,
    TripInviteCreateResponse,
    TripInviteCreateRequest,
    TripMemberAddRequest,
    TripMemberReadinessResponse,
    TripMemberResponse,
    TripOnTripSnapshotResponse,
    TripResponse,
    TripSummaryResponse,
    TripUpdate,
    WorkspaceLastSeenResponse,
    WorkspaceLastSeenUpdateRequest,
)
from app.services.trip_service import TripService

router = APIRouter()


@router.post("/", response_model=TripResponse, status_code=201)
def create_trip(trip_in: TripCreate, db: SessionDep, current_user: CurrentUser):
    return TripService(db).create(trip_in, current_user.id)


@router.get("/", response_model=List[TripResponse])
def read_trips(*, db: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100):
    return TripService(db).get_all(current_user.id, skip, limit)


@router.get("/summaries", response_model=List[TripSummaryResponse])
def read_trip_summaries(*, db: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100):
    return TripService(db).get_summaries(current_user.id, skip, limit)


@router.get("/{trip_id}", response_model=TripResponse)
def read_trip(trip_id: int, db: SessionDep, current_user: CurrentUser): # pyright: ignore[reportInvalidTypeForm]
    return TripService(db).get_one(trip_id, current_user.id)


@router.get("/{trip_id}/members", response_model=List[TripMemberResponse])
def read_trip_members(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return TripService(db).list_members(trip_id, current_user.id)


@router.get("/{trip_id}/member-readiness", response_model=TripMemberReadinessResponse)
def read_trip_member_readiness(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return TripService(db).get_member_readiness(trip_id, current_user.id)


@router.get("/{trip_id}/on-trip-snapshot", response_model=TripOnTripSnapshotResponse)
def read_trip_on_trip_snapshot(
    trip_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    tz: str | None = None,
):
    return TripService(db).get_on_trip_snapshot(trip_id, current_user.id, tz=tz)


@router.post("/{trip_id}/members", response_model=TripMemberResponse, status_code=201)
def add_trip_member(
    trip_id: int,
    member_in: TripMemberAddRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    return TripService(db).add_member(trip_id, current_user.id, member_in)


@router.post("/{trip_id}/invites", response_model=TripInviteCreateResponse, status_code=201)
def create_trip_invite(
    trip_id: int,
    invite_in: TripInviteCreateRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    invite, invite_url = TripService(db).create_invite(trip_id, current_user.id, invite_in)
    return {
        **invite.model_dump(),
        "invite_url": invite_url,
    }


@router.patch("/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: int, trip_in: TripUpdate, db: SessionDep, current_user: CurrentUser):
    return TripService(db).update(trip_id, current_user.id, trip_in)


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: int, db: SessionDep, current_user: CurrentUser):
    TripService(db).delete(trip_id, current_user.id)
    return Response(status_code=204)


@router.post(
    "/{trip_id}/workspace/last-seen",
    response_model=WorkspaceLastSeenResponse,
)
def update_workspace_last_seen(
    trip_id: int,
    payload: WorkspaceLastSeenUpdateRequest,
    db: SessionDep,
    current_user: CurrentUser,
):
    return TripService(db).update_workspace_last_seen(
        trip_id=trip_id,
        user_id=current_user.id,
        payload=payload,
    )

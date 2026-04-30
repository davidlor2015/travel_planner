# Path: app/api/v1/routes/reservations.py
# Summary: Defines reservations API route handlers.

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationUpdate
from app.services.reservation_service import ReservationService

router = APIRouter()


@router.get("/", response_model=list[ReservationResponse])
def list_reservations(
    trip_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    return ReservationService(db).list_reservations(
        trip_id,
        current_user.id,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=ReservationResponse, status_code=201)
def create_reservation(
    trip_id: int,
    reservation_in: ReservationCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return ReservationService(db).create_reservation(trip_id, current_user.id, reservation_in)


@router.patch("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    trip_id: int,
    reservation_id: int,
    reservation_in: ReservationUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return ReservationService(db).update_reservation(
        trip_id,
        current_user.id,
        reservation_id,
        reservation_in,
    )


@router.delete("/{reservation_id}", status_code=204)
def delete_reservation(
    trip_id: int,
    reservation_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    ReservationService(db).delete_reservation(trip_id, current_user.id, reservation_id)
    return Response(status_code=204)

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import case

from app.api.deps import CurrentUser, SessionDep
from app.models.budget_expense import BudgetExpense
from app.models.reservation import Reservation
from app.models.trip import Trip
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationUpdate

router = APIRouter()


def _to_response(reservation: Reservation) -> ReservationResponse:
    return ReservationResponse(
        id=reservation.id,
        trip_id=reservation.trip_id,
        title=reservation.title,
        reservation_type=reservation.reservation_type,
        provider=reservation.provider,
        confirmation_code=reservation.confirmation_code,
        start_at=reservation.start_at,
        end_at=reservation.end_at,
        location=reservation.location,
        notes=reservation.notes,
        amount=reservation.amount,
        currency=reservation.currency,
        budget_expense_id=reservation.budget_expense.id if reservation.budget_expense else None,
        created_at=reservation.created_at,
    )


def _budget_category_for_reservation(reservation_type: str) -> str:
    return {
        "flight": "transport",
        "train": "transport",
        "bus": "transport",
        "car": "transport",
        "hotel": "stay",
        "activity": "activities",
        "restaurant": "food",
        "other": "other",
    }.get(reservation_type, "other")


def _sync_budget_expense(
    db: SessionDep,
    trip_id: int,
    reservation: Reservation,
    sync_to_budget: bool,
) -> None:
    existing = reservation.budget_expense
    if not sync_to_budget or reservation.amount is None:
        if existing is not None:
            db.delete(existing)
        return

    if existing is None:
        existing = BudgetExpense(
            trip_id=trip_id,
            reservation_id=reservation.id,
            label=reservation.title,
            amount=reservation.amount,
            category=_budget_category_for_reservation(reservation.reservation_type),
        )
        db.add(existing)
        return

    existing.label = reservation.title
    existing.amount = reservation.amount
    existing.category = _budget_category_for_reservation(reservation.reservation_type)


def _get_trip(trip_id: int, user_id: int, db: SessionDep) -> Trip:
    trip = db.get(Trip, trip_id)
    if not trip or trip.user_id != user_id:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/", response_model=list[ReservationResponse])
def list_reservations(trip_id: int, db: SessionDep, current_user: CurrentUser):
    _get_trip(trip_id, current_user.id, db)
    rows = (
        db.query(Reservation)
        .filter(Reservation.trip_id == trip_id)
        .order_by(
            case((Reservation.start_at.is_(None), 1), else_=0),
            Reservation.start_at.asc(),
            Reservation.created_at.asc(),
        )
        .all()
    )
    return [_to_response(row) for row in rows]


@router.post("/", response_model=ReservationResponse, status_code=201)
def create_reservation(
    trip_id: int,
    reservation_in: ReservationCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    payload = reservation_in.model_dump()
    sync_to_budget = payload.pop("sync_to_budget", True)
    reservation = Reservation(trip_id=trip_id, **payload)
    db.add(reservation)
    db.flush()
    _sync_budget_expense(db, trip_id, reservation, sync_to_budget)
    db.commit()
    db.refresh(reservation)
    return _to_response(reservation)


@router.patch("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    trip_id: int,
    reservation_id: int,
    reservation_in: ReservationUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    reservation = db.get(Reservation, reservation_id)
    if not reservation or reservation.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Reservation not found")

    payload = reservation_in.model_dump(exclude_unset=True)
    sync_to_budget = payload.pop("sync_to_budget", None)
    for key, value in payload.items():
        setattr(reservation, key, value)

    _sync_budget_expense(
        db,
        trip_id,
        reservation,
        sync_to_budget if sync_to_budget is not None else reservation.budget_expense is not None,
    )
    db.commit()
    db.refresh(reservation)
    return _to_response(reservation)


@router.delete("/{reservation_id}", status_code=204)
def delete_reservation(
    trip_id: int,
    reservation_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    reservation = db.get(Reservation, reservation_id)
    if not reservation or reservation.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.budget_expense is not None:
        db.delete(reservation.budget_expense)
    db.delete(reservation)
    db.commit()
    return Response(status_code=204)

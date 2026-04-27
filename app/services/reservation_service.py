# Path: app/services/reservation_service.py
# Summary: Implements reservation service business logic.

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.models.budget_expense import BudgetExpense
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationUpdate
from app.services.trip_access_service import TripAccessService


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


class ReservationService:
    def __init__(self, db: Session):
        self.db = db
        self.access_service = TripAccessService(db)

    def _to_response(self, reservation: Reservation, member_state_id: int) -> ReservationResponse:
        budget_expense = next(
            (expense for expense in reservation.budget_expenses if expense.member_state_id == member_state_id),
            None,
        )
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
            budget_expense_id=budget_expense.id if budget_expense else None,
            created_at=reservation.created_at,
        )

    def _get_reservation(self, trip_id: int, reservation_id: int) -> Reservation:
        reservation = self.db.get(Reservation, reservation_id)
        if reservation is None or reservation.trip_id != trip_id:
            raise HTTPException(status_code=404, detail="Reservation not found")
        return reservation

    def _sync_budget_expense(
        self,
        *,
        member_state_id: int,
        reservation: Reservation,
        sync_to_budget: bool,
    ) -> None:
        existing = next(
            (expense for expense in reservation.budget_expenses if expense.member_state_id == member_state_id),
            None,
        )
        if not sync_to_budget or reservation.amount is None:
            if existing is not None:
                self.db.delete(existing)
            return

        if existing is None:
            self.db.add(
                BudgetExpense(
                    member_state_id=member_state_id,
                    reservation_id=reservation.id,
                    label=reservation.title,
                    amount=reservation.amount,
                    category=_budget_category_for_reservation(reservation.reservation_type),
                )
            )
            return

        existing.label = reservation.title
        existing.amount = reservation.amount
        existing.category = _budget_category_for_reservation(reservation.reservation_type)

    def list_reservations(self, trip_id: int, user_id: int) -> list[ReservationResponse]:
        context = self.access_service.require_membership(trip_id, user_id)
        rows = (
            self.db.query(Reservation)
            .filter(Reservation.trip_id == trip_id)
            .order_by(
                case((Reservation.start_at.is_(None), 1), else_=0),
                Reservation.start_at.asc(),
                Reservation.created_at.asc(),
            )
            .all()
        )
        return [self._to_response(row, context.member_state.id) for row in rows]

    def create_reservation(
        self,
        trip_id: int,
        user_id: int,
        reservation_in: ReservationCreate,
    ) -> ReservationResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        payload = reservation_in.model_dump()
        sync_to_budget = payload.pop("sync_to_budget", True)
        reservation = Reservation(trip_id=trip_id, **payload)
        self.db.add(reservation)
        self.db.flush()
        self._sync_budget_expense(
            member_state_id=context.member_state.id,
            reservation=reservation,
            sync_to_budget=sync_to_budget,
        )
        self.db.commit()
        self.db.refresh(reservation)
        return self._to_response(reservation, context.member_state.id)

    def update_reservation(
        self,
        trip_id: int,
        user_id: int,
        reservation_id: int,
        reservation_in: ReservationUpdate,
    ) -> ReservationResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        reservation = self._get_reservation(trip_id, reservation_id)

        payload = reservation_in.model_dump(exclude_unset=True)
        sync_to_budget = payload.pop("sync_to_budget", None)
        for key, value in payload.items():
            setattr(reservation, key, value)

        existing_budget_expense = next(
            (expense for expense in reservation.budget_expenses if expense.member_state_id == context.member_state.id),
            None,
        )
        self._sync_budget_expense(
            member_state_id=context.member_state.id,
            reservation=reservation,
            sync_to_budget=sync_to_budget if sync_to_budget is not None else existing_budget_expense is not None,
        )
        self.db.commit()
        self.db.refresh(reservation)
        return self._to_response(reservation, context.member_state.id)

    def delete_reservation(self, trip_id: int, user_id: int, reservation_id: int) -> None:
        self.access_service.require_membership(trip_id, user_id)
        reservation = self._get_reservation(trip_id, reservation_id)
        for expense in list(reservation.budget_expenses):
            self.db.delete(expense)
        self.db.delete(reservation)
        self.db.commit()

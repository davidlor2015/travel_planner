from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.budget_expense import BudgetExpense
from app.schemas.budget import (
    BudgetExpenseCreate,
    BudgetExpenseResponse,
    BudgetExpenseUpdate,
    BudgetLimitUpdate,
    BudgetResponse,
)
from app.services.trip_access_service import TripAccessService


class BudgetService:
    def __init__(self, db: Session):
        self.db = db
        self.access_service = TripAccessService(db)

    def _serialize_budget(self, context) -> BudgetResponse:
        expenses = (
            self.db.query(BudgetExpense)
            .filter(BudgetExpense.member_state_id == context.member_state.id)
            .all()
        )
        return BudgetResponse(
            limit=context.member_state.budget_limit,
            expenses=[BudgetExpenseResponse.model_validate(expense) for expense in expenses],
        )

    def _get_expense(self, trip_id: int, user_id: int, expense_id: int) -> BudgetExpense:
        context = self.access_service.require_membership(trip_id, user_id)
        expense = self.db.get(BudgetExpense, expense_id)
        if expense is None or expense.member_state_id != context.member_state.id:
            raise HTTPException(status_code=404, detail="Expense not found")
        return expense

    def get_budget(self, trip_id: int, user_id: int) -> BudgetResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        return self._serialize_budget(context)

    def update_limit(self, trip_id: int, user_id: int, body: BudgetLimitUpdate) -> BudgetResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        context.member_state.budget_limit = body.limit
        self.db.commit()
        self.db.refresh(context.member_state)
        return self._serialize_budget(context)

    def create_expense(
        self,
        trip_id: int,
        user_id: int,
        expense_in: BudgetExpenseCreate,
    ) -> BudgetExpenseResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        expense = BudgetExpense(
            member_state_id=context.member_state.id,
            label=expense_in.label,
            amount=expense_in.amount,
            category=expense_in.category,
        )
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        return BudgetExpenseResponse.model_validate(expense)

    def update_expense(
        self,
        trip_id: int,
        user_id: int,
        expense_id: int,
        expense_in: BudgetExpenseUpdate,
    ) -> BudgetExpenseResponse:
        expense = self._get_expense(trip_id, user_id, expense_id)
        if expense_in.label is not None:
            expense.label = expense_in.label
        if expense_in.amount is not None:
            expense.amount = expense_in.amount
        if expense_in.category is not None:
            expense.category = expense_in.category
        self.db.commit()
        self.db.refresh(expense)
        return BudgetExpenseResponse.model_validate(expense)

    def delete_expense(self, trip_id: int, user_id: int, expense_id: int) -> None:
        expense = self._get_expense(trip_id, user_id, expense_id)
        self.db.delete(expense)
        self.db.commit()

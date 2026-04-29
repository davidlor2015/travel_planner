# Path: app/api/v1/routes/budget.py
# Summary: Defines budget API route handlers.

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
from app.schemas.budget import (
    BudgetExpenseCreate,
    BudgetExpenseResponse,
    BudgetExpenseUpdate,
    BudgetLimitUpdate,
    BudgetResponse,
)
from app.services.budget_service import BudgetService

router = APIRouter()


@router.get("/", response_model=BudgetResponse)
def get_budget(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return BudgetService(db).get_budget(trip_id, current_user.id)


@router.patch("/limit", response_model=BudgetResponse)
def update_budget_limit(
    trip_id: int, body: BudgetLimitUpdate, db: SessionDep, current_user: CurrentUser
):
    return BudgetService(db).update_limit(trip_id, current_user.id, body)


@router.post("/expenses", response_model=BudgetExpenseResponse, status_code=201)
def create_expense(
    trip_id: int, expense_in: BudgetExpenseCreate, db: SessionDep, current_user: CurrentUser
):
    return BudgetService(db).create_expense(trip_id, current_user.id, expense_in)


@router.patch("/expenses/{expense_id}", response_model=BudgetExpenseResponse)
def update_expense(
    trip_id: int,
    expense_id: int,
    expense_in: BudgetExpenseUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return BudgetService(db).update_expense(trip_id, current_user.id, expense_id, expense_in)


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    trip_id: int, expense_id: int, db: SessionDep, current_user: CurrentUser
):
    BudgetService(db).delete_expense(trip_id, current_user.id, expense_id)
    return Response(status_code=204)

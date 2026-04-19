from typing import List

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
from app.schemas.packing import (
    PackingItemCreate,
    PackingItemUpdate,
    PackingItemResponse,
    PackingSuggestionResponse,
)
from app.services.packing_service import PackingService

router = APIRouter()


@router.get("/", response_model=List[PackingItemResponse])
def list_packing_items(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return PackingService(db).list_items(trip_id, current_user.id)


@router.get("/suggestions", response_model=List[PackingSuggestionResponse])
def list_packing_suggestions(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return PackingService(db).list_suggestions(trip_id, current_user.id)


@router.post("/", response_model=PackingItemResponse, status_code=201)
def create_packing_item(
    trip_id: int, item_in: PackingItemCreate, db: SessionDep, current_user: CurrentUser
):
    return PackingService(db).create_item(trip_id, current_user.id, item_in)


@router.patch("/{item_id}", response_model=PackingItemResponse)
def update_packing_item(
    trip_id: int,
    item_id: int,
    item_in: PackingItemUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return PackingService(db).update_item(trip_id, current_user.id, item_id, item_in)


@router.delete("/{item_id}", status_code=204)
def delete_packing_item(
    trip_id: int, item_id: int, db: SessionDep, current_user: CurrentUser
):
    PackingService(db).delete_item(trip_id, current_user.id, item_id)
    return Response(status_code=204)

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, SessionDep
from app.schemas.prep import PrepItemCreate, PrepItemResponse, PrepItemUpdate
from app.services.prep_service import PrepService

router = APIRouter()


@router.get("/", response_model=list[PrepItemResponse])
def list_prep_items(trip_id: int, db: SessionDep, current_user: CurrentUser):
    return PrepService(db).list_items(trip_id, current_user.id)


@router.post("/", response_model=PrepItemResponse, status_code=201)
def create_prep_item(
    trip_id: int,
    prep_in: PrepItemCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return PrepService(db).create_item(trip_id, current_user.id, prep_in)


@router.patch("/{prep_item_id}", response_model=PrepItemResponse)
def update_prep_item(
    trip_id: int,
    prep_item_id: int,
    prep_in: PrepItemUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return PrepService(db).update_item(trip_id, current_user.id, prep_item_id, prep_in)


@router.delete("/{prep_item_id}", status_code=204)
def delete_prep_item(
    trip_id: int,
    prep_item_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    PrepService(db).delete_item(trip_id, current_user.id, prep_item_id)
    return Response(status_code=204)

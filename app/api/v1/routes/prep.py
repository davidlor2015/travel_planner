from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import case

from app.api.deps import CurrentUser, SessionDep
from app.models.prep_item import PrepItem
from app.models.trip import Trip
from app.schemas.prep import PrepItemCreate, PrepItemResponse, PrepItemUpdate

router = APIRouter()


def _get_trip(trip_id: int, user_id: int, db: SessionDep) -> Trip:
    trip = db.get(Trip, trip_id)
    if not trip or trip.user_id != user_id:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/", response_model=list[PrepItemResponse])
def list_prep_items(trip_id: int, db: SessionDep, current_user: CurrentUser):
    _get_trip(trip_id, current_user.id, db)
    return (
        db.query(PrepItem)
        .filter(PrepItem.trip_id == trip_id)
        .order_by(
            PrepItem.completed.asc(),
            case((PrepItem.due_date.is_(None), 1), else_=0),
            PrepItem.due_date.asc(),
            PrepItem.created_at.asc(),
        )
        .all()
    )


@router.post("/", response_model=PrepItemResponse, status_code=201)
def create_prep_item(
    trip_id: int,
    prep_in: PrepItemCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    item = PrepItem(trip_id=trip_id, **prep_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{prep_item_id}", response_model=PrepItemResponse)
def update_prep_item(
    trip_id: int,
    prep_item_id: int,
    prep_in: PrepItemUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    item = db.get(PrepItem, prep_item_id)
    if not item or item.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Prep item not found")
    for key, value in prep_in.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{prep_item_id}", status_code=204)
def delete_prep_item(
    trip_id: int,
    prep_item_id: int,
    db: SessionDep,
    current_user: CurrentUser,
):
    _get_trip(trip_id, current_user.id, db)
    item = db.get(PrepItem, prep_item_id)
    if not item or item.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Prep item not found")
    db.delete(item)
    db.commit()
    return Response(status_code=204)

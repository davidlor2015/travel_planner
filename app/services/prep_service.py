# Path: app/services/prep_service.py
# Summary: Implements prep service business logic.

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.models.prep_item import PrepItem
from app.schemas.prep import PrepItemCreate, PrepItemResponse, PrepItemUpdate
from app.services.trip_access_service import TripAccessService


class PrepService:
    def __init__(self, db: Session):
        self.db = db
        self.access_service = TripAccessService(db)

    def _get_item(self, trip_id: int, user_id: int, prep_item_id: int) -> PrepItem:
        context = self.access_service.require_membership(trip_id, user_id)
        item = self.db.get(PrepItem, prep_item_id)
        if item is None or item.member_state_id != context.member_state.id:
            raise HTTPException(status_code=404, detail="Prep item not found")
        return item

    def list_items(self, trip_id: int, user_id: int) -> list[PrepItemResponse]:
        context = self.access_service.require_membership(trip_id, user_id)
        items = (
            self.db.query(PrepItem)
            .filter(PrepItem.member_state_id == context.member_state.id)
            .order_by(
                PrepItem.completed.asc(),
                case((PrepItem.due_date.is_(None), 1), else_=0),
                PrepItem.due_date.asc(),
                PrepItem.created_at.asc(),
            )
            .all()
        )
        return [PrepItemResponse.model_validate(item) for item in items]

    def create_item(
        self,
        trip_id: int,
        user_id: int,
        prep_in: PrepItemCreate,
    ) -> PrepItemResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        item = PrepItem(
            member_state_id=context.member_state.id,
            **prep_in.model_dump(),
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return PrepItemResponse.model_validate(item)

    def update_item(
        self,
        trip_id: int,
        user_id: int,
        prep_item_id: int,
        prep_in: PrepItemUpdate,
    ) -> PrepItemResponse:
        item = self._get_item(trip_id, user_id, prep_item_id)
        for key, value in prep_in.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        self.db.commit()
        self.db.refresh(item)
        return PrepItemResponse.model_validate(item)

    def delete_item(self, trip_id: int, user_id: int, prep_item_id: int) -> None:
        item = self._get_item(trip_id, user_id, prep_item_id)
        self.db.delete(item)
        self.db.commit()

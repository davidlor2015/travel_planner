from typing import Any, Iterable, List

from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.match_request import MatchRequest
from app.models.match_result import MatchResult
from app.repositories.base import BaseRepository


class MatchResultRepository(BaseRepository[MatchResult]):
    def __init__(self, db: Session):
        super().__init__(MatchResult, db)

    def _coerce_result(self, item: MatchResult | dict[str, Any]) -> tuple[int, int, float, dict]:
        if isinstance(item, MatchResult):
            return item.request_a_id, item.request_b_id, item.score, item.breakdown

        return (
            item["request_a_id"],
            item["request_b_id"],
            item["score"],
            item["breakdown"],
        )

    def _upsert_one(self, item: MatchResult | dict[str, Any]) -> MatchResult:
        request_a_id, request_b_id, score, breakdown = self._coerce_result(item)

        existing = self.db.scalar(
            select(MatchResult).where(
                MatchResult.request_a_id == request_a_id,
                MatchResult.request_b_id == request_b_id,
            )
        )

        if existing is None:
            existing = MatchResult(
                request_a_id=request_a_id,
                request_b_id=request_b_id,
                score=score,
                breakdown=breakdown,
            )
            self.db.add(existing)
        else:
            existing.score = score
            existing.breakdown = breakdown

        self.db.flush()
        return existing

    def bulk_upsert(self, results: Iterable[MatchResult | dict[str, Any]]) -> List[MatchResult]:
        items = list(results)
        saved: List[MatchResult] = []

        if not items:
            return saved

        try:
            for item in items:
                saved.append(self._upsert_one(item))
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            saved = []
            for item in items:
                try:
                    saved.append(self._upsert_one(item))
                except IntegrityError:
                    self.db.rollback()
                    saved.append(self._upsert_one(item))
            self.db.commit()

        for result in saved:
            self.db.refresh(result)
        return saved

    def get_by_request(
        self,
        request_id: int,
        min_score: float = 0.0,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MatchResult]:
        return list(
            self.db.scalars(
                select(MatchResult)
                .where(
                    or_(
                        MatchResult.request_a_id == request_id,
                        MatchResult.request_b_id == request_id,
                    ),
                    MatchResult.score >= min_score,
                )
                .order_by(MatchResult.score.desc(), MatchResult.id.asc())
                .offset(offset)
                .limit(limit)
            ).all()
        )

    def delete_by_user(self, user_id: int) -> None:
        request_ids = select(MatchRequest.id).where(
            or_(
                MatchRequest.sender_id == user_id,
                MatchRequest.receiver_id == user_id,
            )
        )

        self.db.execute(
            delete(MatchResult).where(
                or_(
                    MatchResult.request_a_id.in_(request_ids),
                    MatchResult.request_b_id.in_(request_ids),
                )
            )
        )
        self.db.commit()

    def delete_by_request(self, request_id: int) -> None:
        self.db.execute(
            delete(MatchResult).where(
                or_(
                    MatchResult.request_a_id == request_id,
                    MatchResult.request_b_id == request_id,
                )
            )
        )
        self.db.commit()

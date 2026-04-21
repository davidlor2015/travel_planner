from datetime import date, datetime, timedelta, timezone
import json
from typing import Any

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core import security
from app.core.config import settings
from app.models.trip_invite import TripInvite
from app.repositories.itinerary_repository import ItineraryRepository
from app.repositories.trip_repository import TripRepository
from app.repositories.trip_invite_repository import TripInviteRepository
from app.repositories.trip_membership_repository import TripMembershipRepository
from app.repositories.travel_profile_repository import TravelProfileRepository
from app.repositories.user_repository import UserRepository
from app.models.trip import Trip
from app.models.trip_membership import TripMembership, TripMemberState
from app.schemas.trip import (
    TripOnTripBlockerResponse,
    TripOnTripSnapshotResponse,
    TripOnTripStopSnapshotResponse,
    TripCreate,
    TripInviteAcceptResponse,
    TripInviteCreateRequest,
    TripInviteDetailResponse,
    TripInviteResponse,
    TripMemberAddRequest,
    TripMemberReadinessItemResponse,
    TripMemberReadinessResponse,
    TripMemberResponse,
    TripUpdate,
    WorkspaceLastSeenResponse,
    WorkspaceLastSeenUpdateRequest,
)
from app.schemas.ai import ItineraryResponse
from app.services.matching_service import MatchingService
from app.services.trip_access_service import TripAccessService


class TripService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TripRepository(db)
        self.itinerary_repo = ItineraryRepository(db)
        self.invite_repo = TripInviteRepository(db)
        self.membership_repo = TripMembershipRepository(db)
        self.user_repo = UserRepository(db)
        self.profile_repo = TravelProfileRepository(db)
        self.matching_service = MatchingService(db)
        self.access_service = TripAccessService(db)

    def create(self, trip_in: TripCreate, user_id: int) -> Trip:
        profile = self.profile_repo.get_by_user(user_id)
        trip = Trip(
            **trip_in.model_dump(),
            user_id=user_id,
            is_discoverable=profile.is_discoverable if profile else True,
        )
        self.db.add(trip)
        self.db.flush()

        membership = TripMembership(
            trip_id=trip.id,
            user_id=user_id,
            role="owner",
            added_by_user_id=user_id,
        )
        self.db.add(membership)
        self.db.flush()

        self.db.add(TripMemberState(membership_id=membership.id))
        self.db.commit()
        return self.repo.get_by_id_and_user(trip.id, user_id) or trip

    def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> list[Trip]:
        return self.repo.get_all_by_user(user_id, skip, limit)

    def get_summaries(self, user_id: int, skip: int = 0, limit: int = 100) -> list[dict[str, object]]:
        trips = self.repo.get_all_by_user_with_planning(user_id, skip, limit)
        summaries: list[dict[str, object]] = []
        today = date.today()
        for trip in trips:
            membership = next(
                (member for member in trip.memberships if member.user_id == user_id),
                None,
            )
            state = membership.member_state if membership else None
            if state is None:
                continue

            packing_total = len(state.packing_items)
            packing_checked = sum(1 for item in state.packing_items if item.checked)
            packing_progress_pct = 0 if packing_total == 0 else round((packing_checked / packing_total) * 100)
            reservation_count = len(trip.reservations)
            reservation_upcoming_count = sum(
                1
                for reservation in trip.reservations
                if reservation.start_at is not None and reservation.start_at.date() >= today
            )
            prep_total = len(state.prep_items)
            prep_completed = sum(1 for item in state.prep_items if item.completed)
            prep_overdue_count = sum(
                1
                for item in state.prep_items
                if not item.completed and item.due_date is not None and item.due_date < today
            )

            budget_total_spent = float(sum(expense.amount for expense in state.budget_expenses))
            budget_remaining = (
                float(state.budget_limit - budget_total_spent)
                if state.budget_limit is not None
                else None
            )
            summaries.append({
                "trip_id": trip.id,
                "packing_total": packing_total,
                "packing_checked": packing_checked,
                "packing_progress_pct": packing_progress_pct,
                "reservation_count": reservation_count,
                "reservation_upcoming_count": reservation_upcoming_count,
                "prep_total": prep_total,
                "prep_completed": prep_completed,
                "prep_overdue_count": prep_overdue_count,
                "budget_limit": float(state.budget_limit) if state.budget_limit is not None else None,
                "budget_total_spent": budget_total_spent,
                "budget_remaining": budget_remaining,
                "budget_is_over": budget_remaining is not None and budget_remaining < 0,
                "budget_expense_count": len(state.budget_expenses),
            })
        return summaries

    def get_one(self, trip_id: int, user_id: int) -> Trip:
        return self.access_service.require_membership(trip_id, user_id).trip

    def update(self, trip_id: int, user_id: int, trip_in: TripUpdate) -> Trip:
        trip = self.access_service.require_membership(trip_id, user_id).trip
        updated_trip = self.repo.update(trip, trip_in.model_dump(exclude_unset=True))
        self.matching_service._invalidate(updated_trip.user_id)
        return updated_trip

    def delete(self, trip_id: int, user_id: int) -> None:
        context = self.access_service.require_membership(trip_id, user_id, owner_only=True)
        trip = context.trip
        self.repo.delete(trip)
        self.matching_service._invalidate(trip.user_id)

    def list_members(self, trip_id: int, user_id: int) -> list[TripMemberResponse]:
        self.access_service.require_membership(trip_id, user_id)
        memberships = self.membership_repo.list_by_trip(trip_id)
        return [
            TripMemberResponse.model_validate({
                "user_id": membership.user_id,
                "email": membership.email,
                "role": membership.role,
                "joined_at": membership.joined_at,
                "status": "active",
                "workspace_last_seen_signature": membership.workspace_last_seen_signature,
                "workspace_last_seen_snapshot": membership.workspace_last_seen_snapshot,
                "workspace_last_seen_at": membership.workspace_last_seen_at,
            })
            for membership in memberships
        ]

    def get_member_readiness(self, trip_id: int, user_id: int) -> TripMemberReadinessResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        memberships = self.membership_repo.list_with_planning_by_trip(trip_id)

        itinerary = self.itinerary_repo.to_itinerary_response(
            trip_id=trip_id,
            title=context.trip.title,
            summary=context.trip.description or context.trip.notes or "",
            source="saved_itinerary",
            source_label="Saved itinerary",
            fallback_used=False,
        )

        blocker_counts_by_email: dict[str, int] = {}
        start_date = context.trip.start_date
        days_until_start = (start_date - date.today()).days if start_date else None
        blocker_window_active = days_until_start is None or days_until_start <= 14

        if itinerary is not None and blocker_window_active:
            for day in itinerary.days:
                for item in day.items:
                    owner = (item.handled_by or "").strip().lower()
                    if not owner:
                        continue
                    status = (item.status or "planned").strip().lower()
                    if status == "planned":
                        blocker_counts_by_email[owner] = blocker_counts_by_email.get(owner, 0) + 1

                for anchor in day.anchors:
                    if anchor.type not in {"flight", "hotel_checkin"}:
                        continue
                    owner = (anchor.handled_by or "").strip().lower()
                    if not owner:
                        continue
                    has_time = bool((anchor.time or "").strip())
                    if not has_time:
                        blocker_counts_by_email[owner] = blocker_counts_by_email.get(owner, 0) + 1

        items: list[TripMemberReadinessItemResponse] = []
        for membership in memberships:
            state = membership.member_state
            member_email = membership.email.lower()
            blocker_count = blocker_counts_by_email.get(member_email, 0)
            metrics: list[int] = []

            if state is not None:
                packing_total = len(state.packing_items)
                if packing_total > 0:
                    packing_checked = sum(1 for item in state.packing_items if item.checked)
                    metrics.append(round((packing_checked / packing_total) * 100))

                if state.budget_limit is not None and state.budget_limit > 0:
                    spent = float(sum(expense.amount for expense in state.budget_expenses))
                    spend_ratio = spent / float(state.budget_limit)
                    metrics.append(0 if spend_ratio > 1 else max(0, min(100, round((1 - spend_ratio) * 100))))

                prep_total = len(state.prep_items)
                if prep_total > 0:
                    prep_completed = sum(1 for item in state.prep_items if item.completed)
                    metrics.append(round((prep_completed / prep_total) * 100))

            if blocker_count > 0:
                metrics.append(max(0, 100 - blocker_count * 25))

            readiness_score = round(sum(metrics) / len(metrics)) if metrics else None
            unknown = readiness_score is None
            status = "unknown"
            if blocker_count > 0:
                status = "needs_attention"
            elif readiness_score is not None and readiness_score >= 80:
                status = "ready"
            elif readiness_score is not None:
                status = "needs_attention"

            items.append(
                TripMemberReadinessItemResponse(
                    user_id=membership.user_id,
                    email=membership.email,
                    role=membership.role,
                    readiness_score=readiness_score,
                    blocker_count=blocker_count,
                    unknown=unknown,
                    status=status,
                )
            )

        return TripMemberReadinessResponse(
            generated_at=datetime.now(timezone.utc),
            members=items,
        )

    def get_on_trip_snapshot(self, trip_id: int, user_id: int) -> TripOnTripSnapshotResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        trip = context.trip
        today = date.today()
        is_active = trip.start_date <= today <= trip.end_date

        itinerary = self.itinerary_repo.to_itinerary_response(
            trip_id=trip_id,
            title=trip.title,
            summary=trip.description or trip.notes or "",
            source="saved_itinerary",
            source_label="Saved itinerary",
            fallback_used=False,
        )
        if itinerary is None:
            return TripOnTripSnapshotResponse(
                generated_at=datetime.now(timezone.utc),
                mode="active" if is_active else "inactive",
                read_only=True,
                today=self._empty_on_trip_stop(),
                next_stop=self._empty_on_trip_stop(),
                blockers=self._build_on_trip_blockers(
                    itinerary=None,
                    today_day=None,
                    today_stop=None,
                    next_stop=None,
                    actor_email=context.membership.user.email,
                    is_group_trip=len(trip.memberships) > 1,
                    is_active=is_active,
                ),
            )

        today_day_resolution = self._pick_today_day(
            itinerary=itinerary,
            today=today,
            trip_start_date=trip.start_date,
            trip_end_date=trip.end_date,
        )
        today_stop_resolution = self._pick_today_stop(
            itinerary=itinerary,
            day_index=today_day_resolution.get("day_index"),
            source=today_day_resolution["source"],
            confidence=today_day_resolution["confidence"],
        )
        next_stop_resolution = self._pick_next_stop(
            itinerary=itinerary,
            today_day_index=today_day_resolution.get("day_index"),
        )
        blockers = self._build_on_trip_blockers(
            itinerary=itinerary,
            today_day=today_day_resolution,
            today_stop=today_stop_resolution,
            next_stop=next_stop_resolution,
            actor_email=context.membership.user.email,
            is_group_trip=len(trip.memberships) > 1,
            is_active=is_active,
        )

        return TripOnTripSnapshotResponse(
            generated_at=datetime.now(timezone.utc),
            mode="active" if is_active else "inactive",
            read_only=True,
            today=TripOnTripStopSnapshotResponse(
                day_number=today_stop_resolution.get("day_number"),
                day_date=today_stop_resolution.get("day_date"),
                title=today_stop_resolution.get("title"),
                time=today_stop_resolution.get("time"),
                location=today_stop_resolution.get("location"),
                status=today_stop_resolution.get("status"),
                source=today_stop_resolution["source"],
                confidence=today_stop_resolution["confidence"],
            ),
            next_stop=TripOnTripStopSnapshotResponse(
                day_number=next_stop_resolution.get("day_number"),
                day_date=next_stop_resolution.get("day_date"),
                title=next_stop_resolution.get("title"),
                time=next_stop_resolution.get("time"),
                location=next_stop_resolution.get("location"),
                status=next_stop_resolution.get("status"),
                source=next_stop_resolution["source"],
                confidence=next_stop_resolution["confidence"],
            ),
            blockers=blockers,
        )

    def _empty_on_trip_stop(self) -> TripOnTripStopSnapshotResponse:
        return TripOnTripStopSnapshotResponse(
            day_number=None,
            day_date=None,
            title=None,
            time=None,
            location=None,
            status=None,
            source="none",
            confidence="low",
        )

    def _parse_itinerary_day_date(self, raw_value: str | None) -> date | None:
        if raw_value is None:
            return None
        value = raw_value.strip()
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None

    def _parse_time_minutes(self, raw_value: str | None) -> int | None:
        if raw_value is None:
            return None
        value = raw_value.strip()
        if not value:
            return None
        for fmt in ("%H:%M", "%I:%M%p", "%I:%M %p"):
            try:
                parsed = datetime.strptime(value.upper(), fmt)
                return parsed.hour * 60 + parsed.minute
            except ValueError:
                continue
        return None

    def _pick_today_day(
        self,
        itinerary: ItineraryResponse,
        today: date,
        trip_start_date: date,
        trip_end_date: date,
    ) -> dict[str, Any]:
        indexed_days: list[tuple[int, Any, date | None]] = []
        for idx, day in enumerate(itinerary.days):
            indexed_days.append((idx, day, self._parse_itinerary_day_date(day.date)))

        exact_matches = [row for row in indexed_days if row[2] == today]
        if len(exact_matches) == 1:
            idx, day, parsed_date = exact_matches[0]
            return {
                "day_index": idx,
                "day_number": day.day_number,
                "day_date": parsed_date,
                "source": "day_date_exact",
                "confidence": "high",
            }
        if len(exact_matches) > 1:
            return {
                "day_index": None,
                "day_number": None,
                "day_date": today,
                "source": "ambiguous",
                "confidence": "low",
            }

        in_trip_window = trip_start_date <= today <= trip_end_date
        if in_trip_window:
            expected_day_number = (today - trip_start_date).days + 1
            for idx, day, parsed_date in indexed_days:
                if day.day_number == expected_day_number:
                    return {
                        "day_index": idx,
                        "day_number": day.day_number,
                        "day_date": parsed_date,
                        "source": "trip_day_offset",
                        "confidence": "medium",
                    }

        return {
            "day_index": None,
            "day_number": None,
            "day_date": None,
            "source": "none",
            "confidence": "low",
        }

    def _pick_today_stop(
        self,
        itinerary: ItineraryResponse,
        day_index: int | None,
        source: str,
        confidence: str,
    ) -> dict[str, Any]:
        if day_index is None or day_index < 0 or day_index >= len(itinerary.days):
            return {
                "day_number": None,
                "day_date": None,
                "title": None,
                "time": None,
                "location": None,
                "status": None,
                "source": source,
                "confidence": confidence,
            }

        day = itinerary.days[day_index]
        parsed_day_date = self._parse_itinerary_day_date(day.date)
        actionable_items = [
            item
            for item in day.items
            if (item.status or "planned") in {"planned", "confirmed"}
        ]
        if len(actionable_items) == 0:
            return {
                "day_number": day.day_number,
                "day_date": parsed_day_date,
                "title": None,
                "time": None,
                "location": None,
                "status": None,
                "source": source,
                "confidence": confidence,
            }

        now = datetime.now()
        now_minutes = now.hour * 60 + now.minute
        time_sorted = sorted(
            enumerate(actionable_items),
            key=lambda row: (
                self._parse_time_minutes(row[1].time) is None,
                self._parse_time_minutes(row[1].time) or 0,
                row[0],
            ),
        )
        selected_item = time_sorted[0][1]
        for _, candidate in time_sorted:
            candidate_minutes = self._parse_time_minutes(candidate.time)
            if candidate_minutes is None:
                continue
            if candidate_minutes >= now_minutes:
                selected_item = candidate
                break

        return {
            "day_number": day.day_number,
            "day_date": parsed_day_date,
            "title": selected_item.title,
            "time": selected_item.time,
            "location": selected_item.location,
            "status": selected_item.status,
            "source": source,
            "confidence": confidence,
        }

    def _pick_next_stop(
        self,
        itinerary: ItineraryResponse,
        today_day_index: int | None,
    ) -> dict[str, Any]:
        start_index = today_day_index if today_day_index is not None else 0
        for day_offset in range(start_index, len(itinerary.days)):
            day = itinerary.days[day_offset]
            parsed_day_date = self._parse_itinerary_day_date(day.date)
            for item in day.items:
                status = (item.status or "planned").strip().lower()
                if status == "skipped":
                    continue
                source = "itinerary_sequence"
                confidence = "medium"
                if parsed_day_date is not None:
                    source = "day_date_exact"
                    confidence = "high"
                return {
                    "day_number": day.day_number,
                    "day_date": parsed_day_date,
                    "title": item.title,
                    "time": item.time,
                    "location": item.location,
                    "status": item.status,
                    "source": source,
                    "confidence": confidence,
                }
        return {
            "day_number": None,
            "day_date": None,
            "title": None,
            "time": None,
            "location": None,
            "status": None,
            "source": "none",
            "confidence": "low",
        }

    def _build_on_trip_blockers(
        self,
        itinerary: ItineraryResponse | None,
        today_day: dict[str, Any] | None,
        today_stop: dict[str, Any] | None,
        next_stop: dict[str, Any] | None,
        actor_email: str,
        is_group_trip: bool,
        is_active: bool,
    ) -> list[TripOnTripBlockerResponse]:
        if not is_active:
            return []

        blockers: list[TripOnTripBlockerResponse] = []
        if not today_stop or not today_stop.get("title"):
            blockers.append(
                TripOnTripBlockerResponse(
                    id="today-stop-missing",
                    severity="blocker",
                    title="Today has no resolved stop",
                    detail="Today could not be resolved to a concrete itinerary stop.",
                )
            )
        if not next_stop or not next_stop.get("title"):
            blockers.append(
                TripOnTripBlockerResponse(
                    id="next-stop-missing",
                    severity="watch",
                    title="Next stop is unclear",
                    detail="The next stop could not be resolved from current itinerary data.",
                )
            )

        if itinerary is None or today_day is None:
            return blockers
        day_index = today_day.get("day_index")
        if day_index is None or day_index < 0 or day_index >= len(itinerary.days):
            return blockers

        day = itinerary.days[day_index]
        planned_items = [
            item
            for item in day.items
            if (item.status or "planned").strip().lower() == "planned"
        ]
        if len(planned_items) > 0:
            blockers.append(
                TripOnTripBlockerResponse(
                    id="today-planned-open",
                    severity="blocker",
                    title="Today still has unconfirmed stops",
                    detail=f"{len(planned_items)} stop(s) are still marked planned.",
                )
            )

        missing_anchor_times = [
            anchor
            for anchor in day.anchors
            if anchor.type in {"flight", "hotel_checkin"} and not (anchor.time or "").strip()
        ]
        if len(missing_anchor_times) > 0:
            blockers.append(
                TripOnTripBlockerResponse(
                    id="today-anchor-time-missing",
                    severity="blocker",
                    title="Travel anchors missing times",
                    detail=f"{len(missing_anchor_times)} flight/hotel anchor(s) do not have a time.",
                )
            )

        if is_group_trip:
            ownership_signals_used = any((item.handled_by or "").strip() for item in day.items)
            unassigned = [
                item
                for item in day.items
                if (item.status or "planned").strip().lower() == "planned"
                and not (item.handled_by or "").strip()
            ]
            if ownership_signals_used and len(unassigned) > 0:
                blockers.append(
                    TripOnTripBlockerResponse(
                        id="today-owner-unassigned",
                        severity="watch",
                        title="Some planned stops have no handler",
                        detail=f"{len(unassigned)} stop(s) need handled-by ownership.",
                    )
                )

            normalized_actor = actor_email.strip().lower()
            waiting_on: dict[str, int] = {}
            for item in day.items:
                if (item.status or "planned").strip().lower() != "planned":
                    continue
                owner = (item.handled_by or "").strip().lower()
                if not owner or owner == normalized_actor:
                    continue
                waiting_on[owner] = waiting_on.get(owner, 0) + 1
            if waiting_on:
                owner_email = max(waiting_on, key=lambda key: waiting_on[key])
                count = waiting_on[owner_email]
                blockers.append(
                    TripOnTripBlockerResponse(
                        id="today-waiting-on-owner",
                        severity="watch",
                        title=f"Waiting on {owner_email.split('@')[0]}",
                        detail=f"{count} planned stop(s) are owned there.",
                        owner_email=owner_email,
                    )
                )

        return blockers

    def add_member(
        self,
        trip_id: int,
        actor_user_id: int,
        member_in: TripMemberAddRequest,
    ) -> TripMemberResponse:
        context = self.access_service.require_membership(trip_id, actor_user_id, owner_only=True)
        user = self.user_repo.get_by_email(member_in.email)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        existing = self.membership_repo.get_by_trip_and_user(trip_id, user.id)
        if existing is not None:
            raise HTTPException(status_code=409, detail="User is already a trip member")

        membership = TripMembership(
            trip_id=trip_id,
            user_id=user.id,
            role="member",
            added_by_user_id=actor_user_id,
        )
        self.db.add(membership)
        self.db.flush()
        self.db.add(TripMemberState(membership_id=membership.id))
        self.db.commit()
        self.db.refresh(membership)
        self.db.refresh(context.trip)
        return TripMemberResponse.model_validate(membership)

    def create_invite(
        self,
        trip_id: int,
        actor_user_id: int,
        invite_in: TripInviteCreateRequest,
    ) -> tuple[TripInviteResponse, str]:
        context = self.access_service.require_membership(trip_id, actor_user_id, owner_only=True)
        normalized_email = invite_in.email.lower()

        existing_user = self.user_repo.get_by_email(normalized_email)
        if existing_user is not None:
            existing_membership = self.membership_repo.get_by_trip_and_user(trip_id, existing_user.id)
            if existing_membership is not None:
                raise HTTPException(status_code=409, detail="User is already a trip member")

        existing_invite = self.invite_repo.get_pending_by_trip_and_email(trip_id, normalized_email)
        if existing_invite is not None:
            self.invite_repo.expire_stale_invite(existing_invite)
            if existing_invite.resolved_status == "pending":
                raise HTTPException(status_code=409, detail="A pending invite already exists for this email")

        raw_token = security.generate_opaque_token()
        invite = TripInvite(
            trip_id=trip_id,
            email=normalized_email,
            invited_by_user_id=actor_user_id,
            token_hash=security.hash_token(raw_token),
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.TRIP_INVITE_EXPIRE_DAYS),
        )
        self.db.add(invite)
        self.db.commit()
        self.db.refresh(invite)
        self.db.refresh(context.trip)

        return self._invite_response(invite), self._invite_url(raw_token)

    def get_invite_detail(self, token: str) -> TripInviteDetailResponse:
        invite = self.invite_repo.get_by_token_hash(security.hash_token(token))
        if invite is None:
            raise HTTPException(status_code=404, detail="Invite not found")
        self.invite_repo.expire_stale_invite(invite)
        self.db.commit()
        trip = invite.trip
        return TripInviteDetailResponse(
            trip_id=trip.id,
            trip_title=trip.title,
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
            email=invite.email,
            status=invite.resolved_status,
            expires_at=invite.expires_at,
        )

    def accept_invite(self, token: str, actor_user_id: int) -> TripInviteAcceptResponse:
        invite = self._require_invite(token)
        user = self.user_repo.get_by_id(actor_user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if user.email.lower() != invite.email.lower():
            raise HTTPException(status_code=403, detail="This invite is for a different email address")

        existing_membership = self.membership_repo.get_by_trip_and_user(invite.trip_id, actor_user_id)
        if existing_membership is not None:
            invite.status = "accepted"
            invite.accepted_by_user_id = actor_user_id
            invite.responded_at = invite.responded_at or datetime.now(timezone.utc)
            self.db.commit()
            return TripInviteAcceptResponse(
                trip_id=invite.trip_id,
                trip_title=invite.trip.title,
                status="accepted",
            )

        membership = TripMembership(
            trip_id=invite.trip_id,
            user_id=actor_user_id,
            role="member",
            added_by_user_id=invite.invited_by_user_id,
        )
        self.db.add(membership)
        self.db.flush()
        self.db.add(TripMemberState(membership_id=membership.id))

        invite.status = "accepted"
        invite.accepted_by_user_id = actor_user_id
        invite.responded_at = datetime.now(timezone.utc)
        self.db.commit()
        return TripInviteAcceptResponse(
            trip_id=invite.trip_id,
            trip_title=invite.trip.title,
            status="accepted",
        )

    def _invite_url(self, raw_token: str) -> str:
        return f"{settings.APP_BASE_URL.rstrip('/')}/invites/{raw_token}"

    def _invite_response(self, invite: TripInvite) -> TripInviteResponse:
        return TripInviteResponse(
            id=invite.id,
            email=invite.email,
            status=invite.resolved_status,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
        )

    def _require_invite(self, token: str) -> TripInvite:
        invite = self.invite_repo.get_by_token_hash(security.hash_token(token))
        if invite is None:
            raise HTTPException(status_code=404, detail="Invite not found")

        self.invite_repo.expire_stale_invite(invite)
        if invite.resolved_status == "expired":
            self.db.commit()
            raise HTTPException(status_code=410, detail="Invite has expired")
        if invite.status != "pending":
            raise HTTPException(status_code=409, detail="Invite has already been accepted")
        return invite

    def update_workspace_last_seen(
        self,
        trip_id: int,
        user_id: int,
        payload: WorkspaceLastSeenUpdateRequest,
    ) -> WorkspaceLastSeenResponse:
        context = self.access_service.require_membership(trip_id, user_id)
        state = context.member_state

        signature = payload.signature.strip()
        if not signature:
            raise HTTPException(status_code=400, detail="signature is required")

        state.workspace_last_seen_signature = signature
        state.workspace_last_seen_snapshot = json.dumps(payload.snapshot, sort_keys=True)
        state.workspace_last_seen_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(state)

        parsed_snapshot: dict | None = None
        if state.workspace_last_seen_snapshot:
            try:
                loaded = json.loads(state.workspace_last_seen_snapshot)
                parsed_snapshot = loaded if isinstance(loaded, dict) else None
            except json.JSONDecodeError:
                parsed_snapshot = None

        return WorkspaceLastSeenResponse(
            workspace_last_seen_signature=state.workspace_last_seen_signature,
            workspace_last_seen_snapshot=parsed_snapshot,
            workspace_last_seen_at=state.workspace_last_seen_at,
        )

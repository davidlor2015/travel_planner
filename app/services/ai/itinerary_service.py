import json
import logging
import re
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session

from app.models.trip import Trip
from app.schemas.ai import ItineraryResponse
from app.services.llm.ollama_client import OllamaClient
from app.services.ai.rule_based_service import generate_rule_based_itinerary
from app.repositories.trip_repository import TripRepository
from app.repositories.itinerary_repository import ItineraryRepository

logger = logging.getLogger(__name__)

# Maximum itinerary days the LLM is asked to generate.
# Kept consistent with rule_based_service.MAX_DAYS so both paths
# produce comparable results for the same trip.
_LLM_MAX_DAYS = 14


def _recover_partial_days(raw: str) -> list[dict]:
    """Extract every syntactically complete DayPlan object from a truncated
    JSON string, stopping at the first broken object.

    The function walks the characters inside the ``"days"`` array, tracks
    brace depth, and JSON-parses each top-level ``{...}`` block it finds.
    It stops as soon as it reaches a block that cannot be parsed (i.e. the
    point of truncation), so all returned dicts are guaranteed valid.

    Returns an empty list when nothing can be recovered.
    """
    m = re.search(r'"days"\s*:\s*\[', raw)
    if not m:
        return []

    text = raw[m.end():]
    days: list[dict] = []
    depth = 0
    obj_start = -1

    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start >= 0:
                fragment = text[obj_start : i + 1]
                try:
                    obj = json.loads(fragment)
                    if isinstance(obj, dict) and "day_number" in obj:
                        days.append(obj)
                except json.JSONDecodeError:
                    # First broken object — everything after this is unreliable
                    break
                obj_start = -1
        elif ch == "]" and depth == 0:
            break  # clean end of days array

    return days


class ItineraryService:
    def __init__(self, db: Session):
        self.trip_repo = TripRepository(db)
        self.itinerary_repo = ItineraryRepository(db)
        self.llm_client = OllamaClient()

    def _build_system_prompt(self) -> str:
        return (
            "You are a travel planner. Output ONLY valid JSON with this structure:\n"
            '{"title":"...","summary":"...","days":[{"day_number":1,"date":null,'
            '"items":[{"time":"09:00AM","title":"...","location":"...","notes":"...",'
            '"cost_estimate":"$20"}]}],"budget_breakdown":null,"packing_list":null,"tips":null}\n'
            "Always fill in cost_estimate for every item (e.g. \"Free\", \"$10\", \"$50\"). "
            "No markdown. No explanation. JSON only."
        )

    def _build_user_prompt(
        self,
        trip: Trip,
        interests: Optional[str] = None,
        budget: Optional[str] = None,
    ) -> str:
        dest = trip.destination or "Unknown Location"
        start = str(trip.start_date) if trip.start_date else "TBD"
        end = str(trip.end_date) if trip.end_date else "TBD"

        # Derive the actual trip length so the model generates the right number
        # of days instead of defaulting to the old hardcoded "3 days max".
        if trip.start_date and trip.end_date:
            calendar_days = (trip.end_date - trip.start_date).days + 1
            num_days = min(calendar_days, _LLM_MAX_DAYS)
        else:
            num_days = 3

        user_interests = interests or "General sightseeing"
        user_budget = budget or "Moderate"

        logger.info(
            "LLM prompt: trip_id=%s dest=%r start=%s end=%s num_days=%d",
            trip.id, dest, start, end, num_days,
        )

        return (
            f"Plan a {num_days}-day trip:\n"
            f"Destination: {dest}\n"
            f"Dates: {start} to {end}\n"
            f"Budget: {user_budget}\n"
            f"Interests: {user_interests}\n"
            f"Generate exactly {num_days} days, 3 activities per day. "
            "Return JSON only."
        )

    def _clean_json_string(self, raw_text: str) -> str:
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.replace("```json", "", 1)
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```", "", 1)
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

    def _parse_or_recover(self, raw: str) -> Optional[ItineraryResponse]:
        """Try a full parse first; fall back to partial day recovery on failure.

        Returns an ``ItineraryResponse`` on success, ``None`` if even partial
        recovery yields nothing.
        """
        clean = self._clean_json_string(raw)

        # ── Full parse ────────────────────────────────────────────────────────
        try:
            return ItineraryResponse(**json.loads(clean))
        except Exception as exc:
            logger.warning(
                "Full JSON parse failed (%s) — attempting partial recovery. "
                "Response tail: %r",
                exc,
                raw[-120:],  # log only the tail to keep logs readable
            )

        # ── Partial recovery ──────────────────────────────────────────────────
        recovered_days = _recover_partial_days(clean)
        if not recovered_days:
            return None

        title_m = re.search(r'"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', clean)
        summary_m = re.search(r'"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', clean)
        title = title_m.group(1) if title_m else "Trip Itinerary"
        summary = (summary_m.group(1) if summary_m else "") + (
            f" (Note: itinerary covers {len(recovered_days)} of the requested days "
            "— the model response was cut short.)"
        )

        logger.warning(
            "Partial recovery succeeded: %d days recovered from truncated response.",
            len(recovered_days),
        )
        try:
            return ItineraryResponse(
                title=title,
                summary=summary,
                days=recovered_days,
                budget_breakdown=None,
                packing_list=None,
                tips=None,
            )
        except Exception as exc:
            logger.error("Partial recovery assembly failed: %s", exc)
            return None

    # ── Public methods ────────────────────────────────────────────────────────

    async def generate_itinerary(
        self,
        trip_id: int,
        user_id: int,
        interests_override: Optional[str] = None,
        budget_override: Optional[str] = None,
    ) -> ItineraryResponse:
        trip = self.trip_repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            raise ValueError("Trip not found or access denied.")

        sys_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(trip, interests_override, budget_override)

        raw_response = await self.llm_client.generate_json(sys_prompt, user_prompt)
        logger.info("LLM raw response length: %d chars", len(raw_response))

        itinerary = self._parse_or_recover(raw_response)
        if itinerary is None:
            logger.error(
                "Failed to parse or recover LLM response. Tail: %r", raw_response[-300:]
            )
            raise ValueError("AI generated invalid data. Please try again.")
        return itinerary

    async def generate_itinerary_rule_based(
        self,
        trip_id: int,
        user_id: int,
        interests_override: Optional[str] = None,
        budget_override: Optional[str] = None,
    ) -> ItineraryResponse:
        """Generates an itinerary using real POI data (OpenTripMap) — no LLM required."""
        trip = self.trip_repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            raise ValueError("Trip not found or access denied.")
        return await generate_rule_based_itinerary(trip, interests_override, budget_override)

    async def stream_itinerary(
        self,
        trip_id: int,
        user_id: int,
        interests_override: Optional[str] = None,
        budget_override: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Yields Server-Sent Events:
          token    — raw LLM text chunk for live display
          complete — validated ItineraryResponse JSON
          error    — human-readable failure message
        """
        trip = self.trip_repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            yield f"event: error\ndata: {json.dumps({'message': 'Trip not found or access denied.'})}\n\n"
            return

        sys_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(trip, interests_override, budget_override)

        full_text = ""
        try:
            async for token in self.llm_client.stream_json(sys_prompt, user_prompt):
                full_text += token
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            logger.error("Streaming LLM error: %s", e)
            yield f"event: error\ndata: {json.dumps({'message': 'LLM connection failed. Is Ollama running?'})}\n\n"
            return

        logger.info("Stream complete: %d chars received", len(full_text))

        itinerary = self._parse_or_recover(full_text)
        if itinerary is not None:
            yield f"event: complete\ndata: {itinerary.model_dump_json()}\n\n"
        else:
            logger.error(
                "Failed to parse or recover streamed response. Tail: %r",
                full_text[-300:],
            )
            yield f"event: error\ndata: {json.dumps({'message': 'AI generated invalid data. Please try again.'})}\n\n"

    def apply_itinerary_to_db(
        self, trip_id: int, user_id: int, itinerary: ItineraryResponse
    ) -> Trip:
        """
        Persists the approved itinerary in two places:
        1. Relational tables (itinerary_days / itinerary_events)
        2. trip.description — JSON fallback for the existing frontend parser
        """
        trip = self.trip_repo.get_by_id_and_user(trip_id, user_id)
        if not trip:
            raise ValueError("Trip not found.")

        self.itinerary_repo.save_itinerary(trip_id, itinerary)

        return self.trip_repo.update(trip, {
            "title": itinerary.title,
            "description": (
                f"SUMMARY: {itinerary.summary}\n\n"
                f"DETAILS (JSON): {itinerary.model_dump_json(indent=2)}"
            ),
        })

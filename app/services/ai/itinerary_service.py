import json
import logging
import re
from copy import deepcopy
from datetime import timedelta
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session

from app.models.trip import Trip
from app.schemas.ai import (
    AIDayRefinementResponse,
    DayPlan,
    ItineraryItem,
    ItineraryItemReference,
    ItineraryResponse,
    RefinementTimeBlock,
    RefinementVariant,
)
from app.services.llm.ollama_client import LLMUnavailableError, OllamaClient
from app.services.ai.rule_based_service import generate_rule_based_itinerary
from app.repositories.trip_repository import TripRepository
from app.repositories.itinerary_repository import ItineraryRepository
from app.services.trip_access_service import TripAccessService

logger = logging.getLogger(__name__)

# Maximum itinerary days the LLM is asked to generate.
# Kept consistent with rule_based_service.MAX_DAYS so both paths
# produce comparable results for the same trip.
_LLM_MAX_DAYS = 14
_TIME_BLOCK_ORDER = {"morning": 0, "afternoon": 1, "evening": 2}


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


def _parse_activity_line(line: str) -> ItineraryItem | None:
    """Parse one activity line produced by embed_itineraries._day_content().

    Expected format:
        [time] title — location. notes (cost_estimate)

    Returns None for lines that don't match (e.g. the day-header line).
    """
    line = line.strip()
    if not line.startswith("["):
        return None
    try:
        time_end = line.index("]")
    except ValueError:
        return None

    time = line[1:time_end]
    rest = line[time_end + 1:].strip()

    # Extract trailing (cost_estimate) — use the last " (...)" group.
    cost = ""
    if rest.endswith(")"):
        paren_start = rest.rfind(" (")
        if paren_start != -1:
            cost = rest[paren_start + 2:-1]
            rest = rest[:paren_start].strip()

    # Split on the em-dash separator.
    if " — " in rest:
        title, remainder = rest.split(" — ", 1)
    else:
        return ItineraryItem(time=time, title=rest, location="", notes="", cost_estimate=cost)

    # First ". " separates location from notes.
    if ". " in remainder:
        location, notes = remainder.split(". ", 1)
    else:
        location, notes = remainder, ""

    return ItineraryItem(
        time=time,
        title=title.strip(),
        location=location.strip(),
        notes=notes.strip(),
        cost_estimate=cost,
    )


def _infer_time_block(item: ItineraryItem, index: int, total_items: int) -> RefinementTimeBlock:
    label = (item.time or "").strip().lower()
    if any(token in label for token in ("morning", "breakfast", "sunrise")):
        return "morning"
    if any(token in label for token in ("afternoon", "lunch", "midday", "noon")):
        return "afternoon"
    if any(token in label for token in ("evening", "night", "dinner", "sunset")):
        return "evening"

    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*([ap]m)?", label)
    if match:
        hour = int(match.group(1))
        meridiem = match.group(3)
        if meridiem == "pm" and hour != 12:
            hour += 12
        elif meridiem == "am" and hour == 12:
            hour = 0
        if hour < 12:
            return "morning"
        if hour < 17:
            return "afternoon"
        return "evening"

    if total_items <= 1:
        return "morning"
    ratio = index / max(total_items - 1, 1)
    if ratio < 0.34:
        return "morning"
    if ratio < 0.67:
        return "afternoon"
    return "evening"


class ItineraryService:
    def __init__(self, db: Session):
        self.trip_repo = TripRepository(db)
        self.itinerary_repo = ItineraryRepository(db)
        self.llm_client = OllamaClient()
        self.access_service = TripAccessService(db)

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

    def _build_refinement_system_prompt(self) -> str:
        return (
            "You are refining one day inside an existing travel itinerary. "
            "Output ONLY valid JSON with this structure:\n"
            '{"day":{"day_number":1,"date":null,"items":[{"time":"09:00AM","title":"...","location":"...",'
            '"notes":"...","cost_estimate":"$20"}]}}\n'
            "Preserve locked activities verbatim when they are supplied. "
            "Return only the refined day object."
        )

    def _describe_item_references(
        self,
        itinerary: ItineraryResponse,
        references: list[ItineraryItemReference],
    ) -> list[str]:
        descriptions: list[str] = []
        for ref in references:
            day = next((d for d in itinerary.days if d.day_number == ref.day_number), None)
            if day is None or ref.item_index >= len(day.items):
                continue
            item = day.items[ref.item_index]
            descriptions.append(
                f"Day {ref.day_number} item {ref.item_index + 1}: "
                f"{item.time or 'Any time'} - {item.title}"
                + (f" in {item.location}" if item.location else "")
            )
        return descriptions

    def _build_refinement_user_prompt(
        self,
        trip: Trip,
        itinerary: ItineraryResponse,
        regenerate_day_number: int,
        regenerate_time_block: Optional[RefinementTimeBlock],
        variant: Optional[RefinementVariant],
        locked_items: list[ItineraryItemReference],
        favorite_items: list[ItineraryItemReference],
    ) -> str:
        day = next((d for d in itinerary.days if d.day_number == regenerate_day_number), None)
        if day is None:
            raise ValueError(f"Day {regenerate_day_number} does not exist in the current itinerary.")

        variant_guidance = {
            "faster_pace": "Make the day feel more energetic with tighter transitions and higher activity density.",
            "cheaper": "Reduce paid experiences and prioritize free or low-cost options.",
            "more_local": "Favor neighborhood-specific, local-feeling activities over generic highlights.",
            "less_walking": "Reduce walking distance, cluster activities tightly, and favor low-mobility transitions.",
        }

        locked_summary = self._describe_item_references(itinerary, locked_items)
        favorite_summary = self._describe_item_references(itinerary, favorite_items)
        scope_label = (
            f"only the {regenerate_time_block} block of day {regenerate_day_number}"
            if regenerate_time_block
            else f"all of day {regenerate_day_number}"
        )

        return (
            f"Trip destination: {trip.destination or 'Unknown location'}\n"
            f"Trip dates: {trip.start_date or 'TBD'} to {trip.end_date or 'TBD'}\n"
            f"Trip notes: {trip.notes or 'No extra notes provided'}\n"
            f"Refine {scope_label}.\n"
            + (f"Variant target: {variant}. {variant_guidance[variant]}\n" if variant else "")
            + (
                "Locked activities that must remain in the refined day exactly as written:\n"
                + "\n".join(f"- {line}" for line in locked_summary)
                + "\n"
                if locked_summary
                else ""
            )
            + (
                "Favorite activities to keep aligned with if possible:\n"
                + "\n".join(f"- {line}" for line in favorite_summary)
                + "\n"
                if favorite_summary
                else ""
            )
            + "Current full itinerary JSON:\n"
            + itinerary.model_dump_json(indent=2)
            + "\nReturn a refined JSON object for only the requested day. "
            + (
                f"Keep the rest of day {regenerate_day_number} coherent while specifically refreshing the {regenerate_time_block} block.\n"
                if regenerate_time_block
                else ""
            )
            + f"Set day_number to {regenerate_day_number} and keep the original date."
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

    def _merge_refined_day(
        self,
        current_itinerary: ItineraryResponse,
        refined_day: DayPlan,
        regenerate_day_number: int,
        regenerate_time_block: Optional[RefinementTimeBlock],
    ) -> ItineraryResponse:
        merged = deepcopy(current_itinerary)

        for index, day in enumerate(merged.days):
            if day.day_number != regenerate_day_number:
                continue

            if regenerate_time_block is None:
                refined_day.day_number = day.day_number
                refined_day.date = day.date
                merged.days[index] = refined_day
                return merged

            existing_groups = {"morning": [], "afternoon": [], "evening": []}
            for item_index, item in enumerate(day.items):
                existing_groups[_infer_time_block(item, item_index, len(day.items))].append(item)

            refined_groups = {"morning": [], "afternoon": [], "evening": []}
            for item_index, item in enumerate(refined_day.items):
                refined_groups[_infer_time_block(item, item_index, len(refined_day.items))].append(item)

            if not refined_groups[regenerate_time_block]:
                refined_groups[regenerate_time_block] = refined_day.items

            combined_items: list[ItineraryItem] = []
            for block in ("morning", "afternoon", "evening"):
                source_items = refined_groups[block] if block == regenerate_time_block else existing_groups[block]
                combined_items.extend(source_items)

            merged.days[index] = DayPlan(
                day_number=day.day_number,
                date=day.date,
                items=combined_items,
            )
            return merged

        raise ValueError(f"Day {regenerate_day_number} does not exist in the current itinerary.")

    # ── Vector DB fallback ────────────────────────────────────────────────────

    def _itinerary_from_chunks(
        self,
        trip: Trip,
        overview: dict,
        day_chunks: list[dict],
        interests: list[str],
        budget: str,
    ) -> ItineraryResponse:
        """Assemble an ItineraryResponse from pre-stored itinerary_chunks rows."""
        requested_days = (
            (trip.end_date - trip.start_date).days + 1
            if trip.start_date and trip.end_date else len(day_chunks)
        )
        days: list[DayPlan] = []
        for chunk in day_chunks[:requested_days]:
            day_number: int = chunk["day_number"]
            date = (
                str(trip.start_date + timedelta(days=day_number - 1))
                if trip.start_date else None
            )
            lines = chunk.get("content", "").strip().split("\n")
            items = [_parse_activity_line(ln) for ln in lines[1:]]  # skip header
            days.append(DayPlan(
                day_number=day_number,
                date=date,
                items=[item for item in items if item is not None],
            ))

        # Overview content format: "{title}\n\n{summary}\n\nDestination: ..."
        # Extract just the summary paragraph (second block).
        content_parts = overview.get("content", "").split("\n\n", 2)
        summary = content_parts[1] if len(content_parts) >= 2 else overview.get("content", "")

        interest_label = ", ".join(interests) if interests else "general sightseeing"
        trim_note = (
            f" Trimmed a {len(day_chunks)}-day pre-generated itinerary to {requested_days} days."
            if len(day_chunks) > requested_days
            else ""
        )
        return ItineraryResponse(
            title=overview["title"],
            summary=(
                f"{summary} "
                f"(Pre-generated itinerary for {interest_label} — Ollama was unavailable.{trim_note})"
            ),
            days=days,
        )

    def _generate_from_vector_db(
        self,
        trip: Trip,
        interests_override: Optional[str],
        budget_override: Optional[str],
    ) -> ItineraryResponse:
        """Fallback path: find the closest pre-generated itinerary in pgvector."""
        from app.services.vector_store import find_best_itinerary, get_day_chunks

        budget = (budget_override or "moderate").strip().lower()
        interests = [
            i.strip().lower()
            for i in (interests_override or "").split(",")
            if i.strip()
        ]
        calendar_days = (
            (trip.end_date - trip.start_date).days + 1
            if trip.start_date and trip.end_date else 3
        )

        overview = find_best_itinerary(
            destination=trip.destination,
            days=calendar_days,
            budget=budget,
            interests=interests,
        )
        if not overview:
            raise ValueError(
                f"Ollama is unavailable and no pre-generated itinerary exists for "
                f"'{trip.destination}'. Run the generation pipeline or start Ollama."
            )

        day_chunks = get_day_chunks(overview["itinerary_id"])
        if not day_chunks:
            raise ValueError(
                f"Ollama is unavailable and the stored itinerary for "
                f"'{trip.destination}' has no day data."
            )

        requested_days = (
            (trip.end_date - trip.start_date).days + 1
            if trip.start_date and trip.end_date else 3
        )
        logger.info(
            "Vector DB fallback: itinerary_id=%s stored_days=%d requested_days=%d trip_id=%s dest=%r",
            overview["itinerary_id"], len(day_chunks), requested_days, trip.id, trip.destination,
        )
        itinerary = self._itinerary_from_chunks(trip, overview, day_chunks, interests, budget)
        logger.info(
            "Vector DB fallback result: returned_days=%d trip_id=%s itinerary_id=%s",
            len(itinerary.days), trip.id, overview["itinerary_id"],
        )
        return itinerary

    # ── Public methods ────────────────────────────────────────────────────────

    async def generate_itinerary(
        self,
        trip_id: int,
        user_id: int,
        interests_override: Optional[str] = None,
        budget_override: Optional[str] = None,
    ) -> ItineraryResponse:
        try:
            trip = self.access_service.require_membership(trip_id, user_id).trip
        except Exception as exc:
            raise ValueError("Trip not found or access denied.") from exc

        sys_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(trip, interests_override, budget_override)

        try:
            raw_response = await self.llm_client.generate_json(sys_prompt, user_prompt)
        except LLMUnavailableError:
            logger.warning(
                "Ollama unavailable for trip_id=%s — attempting vector DB fallback", trip_id
            )
            return self._generate_from_vector_db(trip, interests_override, budget_override)

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
        try:
            trip = self.access_service.require_membership(trip_id, user_id).trip
        except Exception as exc:
            raise ValueError("Trip not found or access denied.") from exc
        return await generate_rule_based_itinerary(trip, interests_override, budget_override)

    async def refine_itinerary(
        self,
        trip_id: int,
        user_id: int,
        current_itinerary: ItineraryResponse,
        regenerate_day_number: int,
        regenerate_time_block: Optional[RefinementTimeBlock] = None,
        variant: Optional[RefinementVariant] = None,
        locked_items: Optional[list[ItineraryItemReference]] = None,
        favorite_items: Optional[list[ItineraryItemReference]] = None,
    ) -> ItineraryResponse:
        try:
            trip = self.access_service.require_membership(trip_id, user_id).trip
        except Exception as exc:
            raise ValueError("Trip not found or access denied.") from exc

        system_prompt = self._build_refinement_system_prompt()
        user_prompt = self._build_refinement_user_prompt(
            trip=trip,
            itinerary=current_itinerary,
            regenerate_day_number=regenerate_day_number,
            regenerate_time_block=regenerate_time_block,
            variant=variant,
            locked_items=locked_items or [],
            favorite_items=favorite_items or [],
        )

        try:
            raw_response = await self.llm_client.generate_json(system_prompt, user_prompt)
        except LLMUnavailableError as exc:
            raise ValueError("Itinerary refinement requires the AI service to be available.") from exc

        try:
            refined = AIDayRefinementResponse(**json.loads(self._clean_json_string(raw_response)))
        except Exception as exc:
            logger.error("Failed to parse refinement response: %s", exc)
            raise ValueError("AI generated invalid refinement data. Please try again.") from exc

        return self._merge_refined_day(
            current_itinerary=current_itinerary,
            refined_day=refined.day,
            regenerate_day_number=regenerate_day_number,
            regenerate_time_block=regenerate_time_block,
        )

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
        except LLMUnavailableError:
            logger.warning(
                "Ollama unavailable during streaming for trip_id=%s — trying vector DB fallback",
                trip_id,
            )
            try:
                fallback = self._generate_from_vector_db(trip, interests_override, budget_override)
                yield f"event: complete\ndata: {fallback.model_dump_json()}\n\n"
            except Exception as fallback_err:
                logger.error("Vector DB fallback failed for trip_id=%s: %s", trip_id, fallback_err)
                yield f"event: error\ndata: {json.dumps({'message': str(fallback_err)})}\n\n"
            return
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
        try:
            trip = self.access_service.require_membership(trip_id, user_id).trip
        except Exception as exc:
            raise ValueError("Trip not found.") from exc

        self.itinerary_repo.save_itinerary(trip_id, itinerary)

        return self.trip_repo.update(trip, {
            "title": itinerary.title,
            "description": (
                f"SUMMARY: {itinerary.summary}\n\n"
                f"DETAILS (JSON): {itinerary.model_dump_json(indent=2)}"
            ),
        })

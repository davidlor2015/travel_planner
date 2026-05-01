from __future__ import annotations

import io
import json
import logging

from fastapi import UploadFile

from app.core.config import settings as _settings
from app.schemas.reservation import ReservationImportFields, ReservationImportResponse
from app.services.llm.gemini_client import GeminiClient
from app.services.llm.ollama_client import LLMUnavailableError, OllamaClient
from app.services.trip_access_service import TripAccessService

logger = logging.getLogger(__name__)

_MIN_PDF_TEXT_CHARS = 40


try:
    import pdfplumber
except Exception:  # pragma: no cover - exercised when dependency is missing
    pdfplumber = None


def _make_llm_client():
    if _settings.LLM_PROVIDER == "gemini":
        return GeminiClient()
    return OllamaClient()


class ReservationImportService:
    def __init__(self, db):
        self.db = db
        self.access_service = TripAccessService(db)
        self.llm_client = _make_llm_client()

    def _empty_fields(self) -> ReservationImportFields:
        return ReservationImportFields()

    def _fallback(
        self,
        *,
        status: str,
        source_type: str,
        message: str,
    ) -> ReservationImportResponse:
        return ReservationImportResponse(
            status=status,
            source_type=source_type,
            fields=self._empty_fields(),
            confidence=None,
            message=message,
        )

    @staticmethod
    def _detect_source_type(filename: str | None, content_type: str | None) -> str:
        name = (filename or "").lower()
        ctype = (content_type or "").lower()

        if ctype == "application/pdf" or name.endswith(".pdf"):
            return "pdf"

        image_mimes = {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "image/gif",
            "image/bmp",
            "image/tiff",
        }
        if ctype in image_mimes or name.endswith((".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tif", ".tiff")):
            return "image"

        return "unknown"

    def _extract_pdf_text(self, raw_bytes: bytes) -> str | None:
        if pdfplumber is None:
            logger.warning("pdfplumber is not installed; cannot parse PDF text")
            return None

        try:
            text_parts: list[str] = []
            with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    if text:
                        text_parts.append(text)
            return "\n".join(text_parts).strip()
        except Exception as exc:
            logger.warning("PDF extraction failed: %s", exc)
            return None

    @staticmethod
    def _clean_json_string(raw_text: str) -> str:
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.replace("```json", "", 1)
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```", "", 1)
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

    def _build_prompts(self, extracted_text: str) -> tuple[str, str]:
        system_prompt = (
            "You extract structured booking details from travel confirmations. "
            "Return only valid JSON. No markdown, no prose. "
            "Do not guess values. Use null when missing."
        )
        user_prompt = (
            "Return JSON with exactly this shape:\n"
            "{\n"
            '  "type": "flight" | "lodging" | "restaurant" | "activity" | "other" | null,\n'
            '  "vendor": string | null,\n'
            '  "confirmation_number": string | null,\n'
            '  "start_date": string | null,\n'
            '  "end_date": string | null,\n'
            '  "start_time": string | null,\n'
            '  "end_time": string | null,\n'
            '  "location_name": string | null,\n'
            '  "address": string | null,\n'
            '  "traveler_names": string[] | null,\n'
            '  "price_total": string | null,\n'
            '  "notes": string | null,\n'
            '  "confidence": "high" | "medium" | "low" | null\n'
            "}\n"
            "Use ISO-style dates when possible (YYYY-MM-DD).\n"
            "Booking type must be one of: flight, lodging, restaurant, activity, other.\n"
            "Travel confirmation text follows:\n\n"
            f"{extracted_text}"
        )
        return system_prompt, user_prompt

    async def _extract_fields_with_llm(self, extracted_text: str) -> ReservationImportResponse:
        system_prompt, user_prompt = self._build_prompts(extracted_text)
        try:
            raw = await self.llm_client.generate_json(system_prompt, user_prompt)
        except LLMUnavailableError:
            return self._fallback(
                status="needs_manual_entry",
                source_type="pdf",
                message="AI extraction is temporarily unavailable. Please enter this booking manually.",
            )
        except Exception as exc:
            logger.warning("LLM extraction failed: %s", exc)
            return self._fallback(
                status="needs_manual_entry",
                source_type="pdf",
                message="Could not extract booking details automatically. Please enter this booking manually.",
            )

        try:
            parsed = json.loads(self._clean_json_string(raw))
            fields = ReservationImportFields(
                type=parsed.get("type"),
                vendor=parsed.get("vendor"),
                confirmation_number=parsed.get("confirmation_number"),
                start_date=parsed.get("start_date"),
                end_date=parsed.get("end_date"),
                start_time=parsed.get("start_time"),
                end_time=parsed.get("end_time"),
                location_name=parsed.get("location_name"),
                address=parsed.get("address"),
                traveler_names=parsed.get("traveler_names"),
                price_total=parsed.get("price_total"),
                notes=parsed.get("notes"),
            )
            confidence = parsed.get("confidence")
            return ReservationImportResponse(
                status="extracted",
                source_type="pdf",
                fields=fields,
                confidence=confidence,
                message=None,
            )
        except Exception as exc:
            logger.warning("LLM returned invalid booking extraction JSON: %s", exc)
            return self._fallback(
                status="needs_manual_entry",
                source_type="pdf",
                message="Could not parse extracted booking details. Please enter this booking manually.",
            )

    async def import_reservation(
        self,
        trip_id: int,
        user_id: int,
        upload: UploadFile,
    ) -> ReservationImportResponse:
        self.access_service.require_membership(trip_id, user_id)

        source_type = self._detect_source_type(upload.filename, upload.content_type)

        raw_bytes = await upload.read()
        if source_type == "pdf":
            text = self._extract_pdf_text(raw_bytes)
            if text is None:
                return self._fallback(
                    status="needs_manual_entry",
                    source_type="pdf",
                    message="This PDF could not be read. Please enter this booking manually.",
                )

            if len("".join(text.split())) < _MIN_PDF_TEXT_CHARS:
                return self._fallback(
                    status="needs_image_extraction",
                    source_type="pdf",
                    message=(
                        "This PDF appears to be scanned or image-only. "
                        "Use image extraction when available, or enter details manually."
                    ),
                )

            return await self._extract_fields_with_llm(text)

        if source_type == "image":
            return self._fallback(
                status="needs_image_extraction",
                source_type="image",
                message="Image extraction is not implemented yet for this backend path.",
            )

        return self._fallback(
            status="unsupported_file",
            source_type="unknown",
            message="Unsupported file type. Please upload a PDF confirmation.",
        )

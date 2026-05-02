from datetime import date
from unittest.mock import AsyncMock

from app.models.reservation import Reservation
from app.models.trip import Trip
from app.schemas.reservation import ReservationImportFields, ReservationImportResponse


def _create_trip(db, user_id: int, attach_trip_membership) -> Trip:
    trip = Trip(
        user_id=user_id,
        title="Import Test Trip",
        destination="New York, USA",
        description=None,
        notes=None,
        start_date=date(2026, 5, 10),
        end_date=date(2026, 5, 13),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    attach_trip_membership(trip, user_id)
    return trip


def test_import_pdf_with_extractable_text_returns_extracted(
    client,
    db,
    user_a,
    auth_headers_user_a,
    attach_trip_membership,
    monkeypatch,
):
    trip = _create_trip(db, user_a.id, attach_trip_membership)

    monkeypatch.setattr(
        "app.services.reservation_import_service.ReservationImportService._extract_pdf_text",
        lambda self, raw_bytes: "Booking confirmation for ANA flight 123 with confirmation ZX81PQ",
    )
    monkeypatch.setattr(
        "app.services.reservation_import_service.ReservationImportService._extract_fields_with_llm",
        AsyncMock(
            return_value=ReservationImportResponse(
                status="extracted",
                source_type="pdf",
                fields=ReservationImportFields(
                    type="flight",
                    vendor="ANA",
                    confirmation_number="ZX81PQ",
                    start_date="2026-05-10",
                    end_date="2026-05-10",
                    start_time="09:15",
                    end_time="13:05",
                    location_name="SFO Terminal 2",
                    address=None,
                    traveler_names=["Alex Doe"],
                    price_total="$642.50",
                    notes=None,
                ),
                confidence="high",
                message=None,
            )
        ),
    )

    before_count = db.query(Reservation).count()
    response = client.post(
        f"/v1/trips/{trip.id}/reservations/import",
        files={"file": ("confirmation.pdf", b"%PDF-1.4 fake", "application/pdf")},
        headers=auth_headers_user_a,
    )
    after_count = db.query(Reservation).count()

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "extracted"
    assert body["source_type"] == "pdf"
    assert body["fields"]["type"] == "flight"
    assert body["fields"]["vendor"] == "ANA"
    assert body["fields"]["confirmation_number"] == "ZX81PQ"
    assert body["confidence"] == "high"
    assert before_count == after_count


def test_import_pdf_with_short_text_returns_needs_image_extraction(
    client,
    db,
    user_a,
    auth_headers_user_a,
    attach_trip_membership,
    monkeypatch,
):
    trip = _create_trip(db, user_a.id, attach_trip_membership)

    monkeypatch.setattr(
        "app.services.reservation_import_service.ReservationImportService._extract_pdf_text",
        lambda self, raw_bytes: "tiny",
    )

    response = client.post(
        f"/v1/trips/{trip.id}/reservations/import",
        files={"file": ("scan.pdf", b"%PDF-1.4 tiny", "application/pdf")},
        headers=auth_headers_user_a,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "needs_image_extraction"
    assert body["source_type"] == "pdf"
    assert body["fields"]["vendor"] is None


def test_import_unsupported_file_type_returns_unsupported_file(
    client,
    db,
    user_a,
    auth_headers_user_a,
    attach_trip_membership,
):
    trip = _create_trip(db, user_a.id, attach_trip_membership)

    response = client.post(
        f"/v1/trips/{trip.id}/reservations/import",
        files={"file": ("notes.txt", b"plain text", "text/plain")},
        headers=auth_headers_user_a,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "unsupported_file"
    assert body["source_type"] == "unknown"


def test_import_respects_trip_access(
    client,
    db,
    user_a,
    user_b,
    auth_headers_user_a,
    attach_trip_membership,
):
    trip = _create_trip(db, user_b.id, attach_trip_membership)

    response = client.post(
        f"/v1/trips/{trip.id}/reservations/import",
        files={"file": ("confirmation.pdf", b"%PDF-1.4 fake", "application/pdf")},
        headers=auth_headers_user_a,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_import_malformed_pdf_does_not_crash_server(
    client,
    db,
    user_a,
    auth_headers_user_a,
    attach_trip_membership,
):
    trip = _create_trip(db, user_a.id, attach_trip_membership)

    response = client.post(
        f"/v1/trips/{trip.id}/reservations/import",
        files={"file": ("broken.pdf", b"not-a-real-pdf", "application/pdf")},
        headers=auth_headers_user_a,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] in {"needs_manual_entry", "needs_image_extraction"}
    assert body["source_type"] == "pdf"

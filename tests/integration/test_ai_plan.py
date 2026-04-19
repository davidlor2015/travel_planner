import pytest
from unittest.mock import patch, AsyncMock
from datetime import date
from fastapi.testclient import TestClient

from app.models.trip import Trip
from app.services.llm.ollama_client import LLMUnavailableError

MOCK_JSON_RESPONSE = """
{
    "title": "Paris Adventure",
    "summary": "A lovely time in Paris.",
    "days": [
        {
            "day_number": 1,
            "items": [
                {"title": "Eiffel Tower", "time": "09:00", "cost_estimate": "30 EUR"}
            ]
        }
    ],
    "packing_list": ["Scarf", "Camera"]
}
"""


def test_generate_plan_success(client: TestClient, auth_headers_user_a, user_a, db, attach_trip_membership):
    new_trip = Trip(
        title="My Paris Trip",
        destination="Paris",
        user_id=user_a.id,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 5),
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    attach_trip_membership(new_trip, user_a.id)

    with patch(
        "app.services.llm.ollama_client.OllamaClient.generate_json",
        new_callable=AsyncMock,
    ) as mock_generate:
        mock_generate.return_value = MOCK_JSON_RESPONSE

        response = client.post(
            "/v1/ai/plan",
            json={"trip_id": new_trip.id},
            headers=auth_headers_user_a,
        )

        if response.status_code != 200:
            print("ERROR DETAILS:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Paris Adventure"
    assert len(data["days"]) == 1
    assert data["source"] == "llm_optional"
    assert data["fallback_used"] is False


def test_generate_plan_not_found(client: TestClient, auth_headers_user_a):
    response = client.post(
        "/v1/ai/plan",
        json={"trip_id": 99999},
        headers=auth_headers_user_a,
    )

    if response.status_code != 400:
        print("ERROR DETAILS:", response.json())

    assert response.status_code == 400


def test_generate_plan_vector_fallback_trims_to_trip_days(
    client: TestClient,
    auth_headers_user_a,
    user_a,
    db,
    attach_trip_membership,
):
    new_trip = Trip(
        title="Tokyo Long Weekend",
        destination="Tokyo, Japan",
        user_id=user_a.id,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 3),
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    attach_trip_membership(new_trip, user_a.id)

    overview = {
        "itinerary_id": "tokyo-7d-mod-food-hist-walk-bal",
        "title": "Tokyo Food and History Adventure",
        "content": (
            "Tokyo Food and History Adventure\n\n"
            "Explore Tokyo.\n\n"
            "Destination: Tokyo, Japan. 7 days. Budget: moderate."
        ),
        "budget": "moderate",
        "days": 7,
        "interests": ["food", "history", "walking"],
        "pace": "balanced",
    }
    day_chunks = [
        {
            "day_number": idx,
            "title": f"Day {idx}",
            "content": f"Day {idx}: Theme\n[09:00AM] Activity {idx} — Tokyo. Notes ({idx}000 JPY)",
        }
        for idx in range(1, 8)
    ]

    with patch(
        "app.services.llm.ollama_client.OllamaClient.generate_json",
        new_callable=AsyncMock,
    ) as mock_generate, patch(
        "app.services.vector_store.find_best_itinerary",
        return_value=overview,
    ), patch(
        "app.services.vector_store.get_day_chunks",
        return_value=day_chunks,
    ):
        mock_generate.side_effect = LLMUnavailableError("Ollama unavailable")

        response = client.post(
            "/v1/ai/plan",
            json={"trip_id": new_trip.id},
            headers=auth_headers_user_a,
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["days"]) == 3
    assert [day["day_number"] for day in data["days"]] == [1, 2, 3]
    assert "Trimmed a 7-day pre-generated itinerary to 3 days." in data["summary"]
    assert data["source"] == "knowledge_base_fallback"
    assert data["fallback_used"] is True

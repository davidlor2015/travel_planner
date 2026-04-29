from unittest.mock import patch


class FakeResponse:
    def __init__(self, payload, *, should_raise=False):
        self._payload = payload
        self._should_raise = should_raise

    def raise_for_status(self):
        if self._should_raise:
            raise RuntimeError("provider exploded with private upstream details")

    def json(self):
        return self._payload


class FakeAsyncClient:
    last_request = None
    response = FakeResponse([])

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, *, params=None, headers=None):
        FakeAsyncClient.last_request = {
            "url": url,
            "params": params,
            "headers": headers,
            "timeout": self.kwargs.get("timeout"),
        }
        return FakeAsyncClient.response


def test_destination_search_requires_auth(client):
    res = client.get("/v1/destinations/search", params={"q": "italy"})

    assert res.status_code == 401


def test_destination_search_normalizes_provider_response(client, auth_headers_user_a):
    FakeAsyncClient.response = FakeResponse(
        [
            {
                "place_id": 123,
                "display_name": "Rome, Roma Capitale, Lazio, Italy",
                "name": "Rome",
                "lat": "41.8933203",
                "lon": "12.4829321",
                "address": {
                    "country": "Italy",
                    "country_code": "it",
                    "state": "Lazio",
                },
            },
            {
                "place_id": 124,
                "display_name": "Rome, Roma Capitale, Lazio, Italy",
                "name": "Rome duplicate",
                "lat": "41.8933203",
                "lon": "12.4829321",
                "address": {"country": "Italy", "country_code": "it"},
            },
            {
                "place_id": 125,
                "display_name": "Missing coordinates",
                "address": {"country": "Italy"},
            },
        ]
    )

    with patch("app.services.destination_search_service.httpx.AsyncClient", FakeAsyncClient):
        res = client.get(
            "/v1/destinations/search",
            params={"q": "rome"},
            headers=auth_headers_user_a,
        )

    assert res.status_code == 200
    assert FakeAsyncClient.last_request["timeout"] == 8
    assert FakeAsyncClient.last_request["params"] == {
        "q": "rome",
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 8,
        "dedupe": 1,
        "accept-language": "en",
    }
    assert FakeAsyncClient.last_request["headers"]["User-Agent"] == (
        "Waypoint/1.0 destination-search"
    )
    assert res.json() == [
        {
            "id": "nominatim:123",
            "name": "Rome",
            "displayName": "Rome, Roma Capitale, Lazio, Italy",
            "latitude": 41.8933203,
            "longitude": 12.4829321,
            "country": "Italy",
            "countryCode": "IT",
            "region": "Lazio",
            "source": "nominatim",
        }
    ]


def test_destination_search_provider_failure_returns_clean_503(
    client,
    auth_headers_user_a,
):
    FakeAsyncClient.response = FakeResponse([], should_raise=True)

    with patch("app.services.destination_search_service.httpx.AsyncClient", FakeAsyncClient):
        res = client.get(
            "/v1/destinations/search",
            params={"q": "rome"},
            headers=auth_headers_user_a,
        )

    assert res.status_code == 503
    assert res.json() == {"detail": "Destination search is temporarily unavailable."}
    assert "private upstream details" not in res.text

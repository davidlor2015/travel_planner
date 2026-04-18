from app.services import vector_store


class _FakeCursor:
    def __init__(self) -> None:
        self.executed: list[str] = []
        self._fetchone_calls = 0

    def execute(self, query: str, params: dict) -> None:
        self.executed.append(query)

    def fetchone(self):
        self._fetchone_calls += 1
        if self._fetchone_calls == 1:
            return None
        return {
            "itinerary_id": "itin_1",
            "title": "Rome Sample",
            "content": "Summary",
            "budget": "moderate",
            "days": 3,
            "interests": ["food"],
            "pace": "balanced",
        }

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None


class _FakeConnection:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor

    def cursor(self, cursor_factory=None):
        return self._cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None


def test_find_best_itinerary_escapes_percent_in_prefix_fallback(monkeypatch):
    cursor = _FakeCursor()
    connection = _FakeConnection(cursor)

    def fake_conn():
        return connection

    monkeypatch.setattr(vector_store, "_conn", fake_conn)

    row = vector_store.find_best_itinerary(
        destination="Rome",
        days=3,
        budget="moderate",
        interests=["food"],
    )

    assert row is not None
    assert len(cursor.executed) == 2
    assert "LIKE LOWER(%(destination)s) || '%%'" in cursor.executed[1]


def test_find_best_itinerary_matches_city_only_record_for_city_country_query(monkeypatch):
    class _TrackingCursor(_FakeCursor):
        def __init__(self) -> None:
            super().__init__()
            self.params: list[dict] = []

        def execute(self, query: str, params: dict) -> None:
            self.executed.append(query)
            self.params.append(params)

        def fetchone(self):
            params = self.params[-1]
            query = self.executed[-1]
            if (
                params["destination"] == "Tokyo"
                and "LOWER(%(destination)s) LIKE LOWER(destination) || '%%'" in query
            ):
                return {
                    "itinerary_id": "tokyo_match",
                    "title": "Tokyo Match",
                    "content": "Summary",
                    "budget": "moderate",
                    "days": 5,
                    "interests": ["food"],
                    "pace": "balanced",
                }
            return None

    cursor = _TrackingCursor()
    connection = _FakeConnection(cursor)

    def fake_conn():
        return connection

    monkeypatch.setattr(vector_store, "_conn", fake_conn)

    row = vector_store.find_best_itinerary(
        destination="Tokyo, Japan",
        days=5,
        budget="moderate",
        interests=["food"],
    )

    assert row is not None
    assert row["itinerary_id"] == "tokyo_match"
    assert any(params["destination"] == "Tokyo" for params in cursor.params)

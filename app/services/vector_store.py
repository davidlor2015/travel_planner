"""
Low-level interface to the itinerary_chunks Postgres/pgvector table.

Each call opens a fresh connection and commits before closing.  This is
intentional — the callers are offline pipeline scripts that process records
in small batches, not a high-throughput API path.


"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy uses the "postgresql+psycopg2://" scheme; psycopg2 needs plain
# "postgresql://" (or "postgres://").
_DSN = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

_INSERT_SQL = """
INSERT INTO itinerary_chunks (
    itinerary_id, destination, country, days,
    budget, interests, pace,
    chunk_type, day_number, title, content, source_type, embedding
) VALUES (
    %(itinerary_id)s, %(destination)s, %(country)s, %(days)s,
    %(budget)s, %(interests)s, %(pace)s,
    %(chunk_type)s, %(day_number)s, %(title)s, %(content)s, %(source_type)s, %(embedding)s
)
"""

_DELETE_SQL = "DELETE FROM itinerary_chunks WHERE itinerary_id = %(itinerary_id)s"
_FIND_BEST_SQL = """
    SELECT itinerary_id, title, content, budget, days, interests, pace
    FROM   itinerary_chunks
    WHERE  chunk_type = 'overview'
      AND  {dest_predicate}
    ORDER BY
        (budget = %(budget)s)::int DESC,
        ABS(days - %(days)s) ASC
    LIMIT 1
"""


def _destination_candidates(destination: str) -> list[str]:
    """Return normalized destination variants in priority order."""
    raw = (destination or "").strip()
    if not raw:
        return []

    candidates: list[str] = [raw]

    city_only = raw.split(",", 1)[0].strip()
    if city_only and city_only.lower() != raw.lower():
        candidates.append(city_only)

    return candidates


@contextmanager
def _conn() -> Generator[psycopg2.extensions.connection, None, None]:
    """Yield a pgvector-registered connection, committing on clean exit."""
    connection = psycopg2.connect(_DSN)
    register_vector(connection)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def upsert_chunks(chunks: list[dict]) -> int:
    """Delete existing chunks for each itinerary_id then insert *chunks*.

    Returns the number of rows inserted.

    Each dict in *chunks* must contain every column listed in _INSERT_SQL.
    ``embedding`` should be a plain Python list[float].
    ``interests`` should be a Python list[str] (psycopg2 maps this to TEXT[]).
    """
    if not chunks:
        return 0

    # Gather the distinct itinerary IDs in this batch so we can clean up first.
    ids_in_batch = {c["itinerary_id"] for c in chunks}

    with _conn() as connection:
        with connection.cursor() as cur:
            for iid in ids_in_batch:
                cur.execute(_DELETE_SQL, {"itinerary_id": iid})

            psycopg2.extras.execute_batch(cur, _INSERT_SQL, chunks)

    logger.info(
        "upsert_chunks: %d rows for %d itinerary id(s).",
        len(chunks), len(ids_in_batch),
    )
    return len(chunks)


def chunk_count() -> int:
    """Return the total number of rows in itinerary_chunks."""
    with _conn() as connection:
        with connection.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM itinerary_chunks")
            return cur.fetchone()[0]


def find_best_itinerary(
    destination: str,
    days: int,
    budget: str,
    interests: list[str],
) -> dict | None:
    """Return the overview chunk that best matches the given trip parameters.

    Matching priority:
      1. Exact destination (case-insensitive); falls back to prefix LIKE.
      2. Budget match preferred.
      3. Closest days count.

    Returns a dict with keys: itinerary_id, title, summary, budget, days,
    interests, pace — or None if the table is empty or no destination match
    is found.
    """
    params: dict = {"budget": budget, "days": days}
    candidates = _destination_candidates(destination)

    search_predicates = [
        ("exact", "LOWER(destination) = LOWER(%(destination)s)"),
        ("stored_prefix", "LOWER(destination) LIKE LOWER(%(destination)s) || '%%'"),
        # Handles trips stored as "Tokyo, Japan" when embedded records use "Tokyo".
        ("query_prefix", "LOWER(%(destination)s) LIKE LOWER(destination) || '%%'"),
    ]

    with _conn() as connection:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            row = None
            for _, predicate in search_predicates:
                if row is not None:
                    break
                for candidate in candidates:
                    cur.execute(
                        _FIND_BEST_SQL.format(dest_predicate=predicate),
                        {**params, "destination": candidate},
                    )
                    row = cur.fetchone()
                    if row is not None:
                        break

    if row is None:
        logger.warning("find_best_itinerary: no match for destination=%r", destination)
        return None

    logger.info(
        "find_best_itinerary: matched itinerary_id=%s (dest=%r budget=%s days=%d)",
        row["itinerary_id"], destination, row["budget"], row["days"],
    )
    return dict(row)


def get_day_chunks(itinerary_id: str) -> list[dict]:
    """Return all day chunks for *itinerary_id*, ordered by day_number."""
    with _conn() as connection:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT day_number, title, content
                FROM   itinerary_chunks
                WHERE  itinerary_id = %(itinerary_id)s
                  AND  chunk_type   = 'day'
                ORDER BY day_number
                """,
                {"itinerary_id": itinerary_id},
            )
            return [dict(row) for row in cur.fetchall()]

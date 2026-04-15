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

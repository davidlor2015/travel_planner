-- Waypoint — itinerary_chunks vector table
-- Run this once against your Postgres database before executing any pipeline script.
--
--   psql $DATABASE_URL -f data/schema.sql

-- 1. Enable the pgvector extension (requires pgvector to be installed on the server).
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the chunks table.
CREATE TABLE IF NOT EXISTS itinerary_chunks (
    id              SERIAL          PRIMARY KEY,

    -- Source itinerary identity
    itinerary_id    TEXT            NOT NULL,
    destination     TEXT            NOT NULL,
    country         TEXT            NOT NULL,
    days            INTEGER         NOT NULL CHECK (days > 0),
    budget          TEXT            NOT NULL,
    interests       TEXT[]          NOT NULL,
    pace            TEXT            NOT NULL,

    -- Chunk identity
    chunk_type      TEXT            NOT NULL CHECK (chunk_type IN ('overview', 'day')),
    day_number      INTEGER,                        -- NULL for overview chunks
    title           TEXT            NOT NULL,
    content         TEXT            NOT NULL,

    -- Provenance
    source_type     TEXT            NOT NULL CHECK (source_type IN ('seed', 'generated')),

    -- 1024-dim embedding (mxbai-embed-large via Ollama)
    embedding       vector(1024)    NOT NULL,

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 3. Retrieval index — IVFFlat with cosine distance.
--    Build this AFTER the table has been populated (>= a few hundred rows)
--    for best performance.  lists = sqrt(row_count) is a good starting point.
CREATE INDEX IF NOT EXISTS itinerary_chunks_embedding_idx
    ON itinerary_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 4. Metadata indexes for pre-filtering before vector search.
CREATE INDEX IF NOT EXISTS itinerary_chunks_destination_idx
    ON itinerary_chunks (destination);

CREATE INDEX IF NOT EXISTS itinerary_chunks_itinerary_id_idx
    ON itinerary_chunks (itinerary_id);

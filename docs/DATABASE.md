# Database

Database architecture and schema notes for the current `travel-planner` backend.

## Scope and Source of Truth

- ORM models: `app/models/*.py`
- SQLAlchemy metadata import: `app/db/base.py`
- Engine/session wiring: `app/db/session.py`
- Migrations: `alembic/versions/*.py`
- Vector-store table bootstrap SQL: `data/schema.sql`

## Primary Database Runtime

- Primary runtime path is PostgreSQL via SQLAlchemy (`DATABASE_URL` in settings).
- Migration runner is Alembic (`alembic/env.py` reads `settings.DATABASE_URL`).

## Main Tables (Current ORM)

## Identity and membership

### `users`

- Model: `app/models/user.py`
- Key fields: `email` (unique), `display_name`, `hashed_password`, `email_verified`, `email_verified_at`
- Relationships:
  - owns trips (`trips.user_id`)
  - has memberships (`trip_memberships.user_id`)
  - participates in invites, matching, and profile

### `trips`

- Model: `app/models/trip.py`
- Key fields: `user_id` (owner FK), `title`, `destination`, `start_date`, `end_date`, `is_discoverable`
- Relationships:
  - memberships (`trip_memberships`)
  - invites (`trip_invites`)
  - itinerary days (`itinerary_days`)
  - reservations (`reservations`)
  - match requests (`match_requests`)

### `trip_memberships`

- Model: `app/models/trip_membership.py`
- Unique constraint: `(trip_id, user_id)`
- Key fields: `trip_id`, `user_id`, `role`, `added_by_user_id`
- Relationship: one-to-one `trip_member_states`

### `trip_member_states`

- Model: `app/models/trip_membership.py`
- Unique field: `membership_id`
- Key fields: `budget_limit`, `workspace_last_seen_signature`, `workspace_last_seen_snapshot`, `workspace_last_seen_at`
- Relationship root for member-scoped logistics:
  - `packing_items`
  - `budget_expenses`
  - `prep_items`

### `trip_invites`

- Model: `app/models/trip_invite.py`
- Key fields: `trip_id`, `email`, `token_hash` (unique), `status`, `expires_at`, `accepted_by_user_id`
- Notes:
  - `resolved_status` computes `expired` dynamically when pending invite is past `expires_at`

## Itinerary and execution

### `itinerary_days`

- Model: `app/models/itinerary.py`
- Key fields: `trip_id`, `day_number`, `day_date` (string), `day_title`, `day_note`
- Relationship: one-to-many `itinerary_events`, `itinerary_day_anchors`

### `itinerary_events`

- Model: `app/models/itinerary.py`
- Key fields: `day_id`, `sort_order`, `time`, `title`, `location`, `lat`, `lon`, `cost_estimate`, `status`
- Ownership fields:
  - normalized user FKs: `handled_by_user_id`, `booked_by_user_id`
  - compatibility fields: `handled_by_legacy`, `booked_by_legacy`

### `itinerary_day_anchors`

- Model: `app/models/itinerary.py`
- Key fields: `day_id`, `sort_order`, `anchor_type`, `label`, `time`, `note`
- Ownership fields mirror itinerary events (`*_user_id`, `*_legacy`)

### `trip_execution_events`

- Model: `app/models/trip_execution_event.py`
- Append-only execution log for on-trip behavior
- Key fields:
  - `kind` (`stop_status` or `unplanned_stop`)
  - `stop_ref`, `status`
  - unplanned payload: `day_date`, `time`, `title`, `location`, `notes`
  - optional `client_request_id` for idempotent retries
- Important index:
  - partial unique index on `(trip_id, client_request_id)` when `client_request_id IS NOT NULL`

## Logistics

### `reservations`

- Model: `app/models/reservation.py`
- Trip-level shared reservation rows
- Key fields: `trip_id`, `reservation_type`, `start_at`, `end_at`, `amount`, `currency`

### `budget_expenses`

- Model: `app/models/budget_expense.py`
- Member-scoped expenses via `member_state_id`
- Optional link to reservation: `reservation_id`
- Unique constraint: `(member_state_id, reservation_id)`

### `packing_items`

- Model: `app/models/packing_item.py`
- Member-scoped via `member_state_id`
- Key fields: `label`, `checked`

### `prep_items`

- Model: `app/models/prep_item.py`
- Member-scoped via `member_state_id`
- Key fields: `title`, `prep_type`, `due_date`, `completed`

## Matching and discovery

### `travel_profiles`

- Model: `app/models/travel_profile.py`
- One profile per user (`user_id` unique)
- Enums persisted as non-native enum strings

### `match_requests`

- Model: `app/models/match_request.py`
- Key fields: `sender_id`, `receiver_id`, `trip_id`, `status`
- Partial unique index `uq_match_requests_open_per_trip` for open requests

### `match_results`

- Model: `app/models/match_result.py`
- Unique constraint: `(request_a_id, request_b_id)`
- Stores `score` and JSON `breakdown`

### `match_interactions`

- Model: `app/models/match_interaction.py`
- Unique constraint: `(user_id, request_id, match_result_id)`
- Tracks interaction status and optional note

### `explore_destinations`

- Model: `app/models/explore_destination.py`
- Key fields: `slug` (unique), `city`, `country`, `region`, `tag`, `sort_order`, `is_active`

## Relationship and Modeling Decisions

## 1) Member-scoped state for logistics

- Packing, prep, and budget are anchored to `trip_member_states`, not directly to `trips`.
- This allows personal planning state in shared trips.
- Migration source: `c9f0a1b2c3d4_add_trip_memberships_and_member_state.py`

## 2) Plan data separated from execution data

- Saved itinerary remains in `itinerary_days`/`itinerary_events`.
- On-trip execution writes append-only rows to `trip_execution_events`.
- Snapshots overlay latest execution events instead of mutating itinerary rows.
- Related model and service files:
  - `app/models/trip_execution_event.py`
  - `app/services/trip_service.py`
  - `app/repositories/trip_execution_repository.py`

## 3) Ownership metadata evolution for itinerary

- Ownership fields were added as normalized user IDs plus legacy string fallback.
- Anchors became first-class rows in `itinerary_day_anchors`.
- Migration source: `1a2b3c4d5e6f_add_itinerary_anchors_and_ownership_fields.py`

## 4) Idempotency for unplanned-stop writes

- `client_request_id` plus partial unique index handles retry dedupe.
- Migration source: `e1f2a3b4c5d6_add_client_request_id_to_trip_execution_events.py`

## Migrations

## Run migrations

From root `Makefile`:

```bash
make migrate
```

Equivalent runtime behavior in Docker backend startup (`Dockerfile`):

```bash
alembic upgrade head
```

## Migration timeline (high level)

Ordered by current revision filenames in `alembic/versions`:

- `eb8ceb58b88e_create_user_table.py`
- `70fee314e52b_add_trips_table.py`
- `3f8a1b9c2d4e_add_itinerary_tables.py`
- `8d7f1c2a9b4e_add_travel_profiles_table.py`
- `c1d2e3f4a5b6_add_packing_budget_tables.py`
- `b8c9d0e1f2a3_add_prep_items_table.py`
- `c9f0a1b2c3d4_add_trip_memberships_and_member_state.py`
- `c7d8e9f0a1b2_add_workspace_last_seen_to_trip_member_states.py`
- `d0a1b2c3d4e5_add_trip_execution_events_table.py`
- `e1f2a3b4c5d6_add_client_request_id_to_trip_execution_events.py`
- `f6a7b8c9d0e1_add_reservations_table.py`
- `a7b8c9d0e1f2_link_reservations_to_budget.py`
- `1a2b3c4d5e6f_add_itinerary_anchors_and_ownership_fields.py`
- plus additional profile/invite/explore/user-field and merge revisions in the same folder

Current behavior should be confirmed when auditing exact migration graph order and branch merges.

## Vector Store Table (`itinerary_chunks`)

- Separate from ORM/Alembic path
- Defined in `data/schema.sql`
- Uses pgvector extension and `vector(1024)` embeddings
- Used by fallback itinerary retrieval in `app/services/vector_store.py`

If vector search/fallback is needed in an environment, `data/schema.sql` must be applied to the target Postgres database.

## Known Schema Notes to Confirm

- `.env.docker.example` currently references a MySQL URL while ORM models/migrations and compose runtime are Postgres-oriented. Current behavior should be confirmed before using `.env.docker.example` as authoritative.
- If you need exact column defaults/check constraints beyond what is listed here, verify in code and migration files.

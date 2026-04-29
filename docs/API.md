# API

Summary of important backend endpoints and request/response behavior for the current FastAPI app mounted in `app/main.py`.

## Scope and Source of Truth

- Active API router prefix: `/v1/*`
- Main route registration: `app/main.py`
- Route handlers: `app/api/v1/routes/*.py`
- Schemas: `app/schemas/*.py`
- Service behavior and errors: `app/services/*.py`, `app/services/ai/*.py`

This document is intentionally practical, not a full field-by-field OpenAPI dump.

## Conventions

- Auth model: OAuth2 bearer tokens (`Authorization: Bearer <access_token>`)
- Token issue/refresh endpoints: `/v1/auth/login`, `/v1/auth/refresh`
- JSON request/response by default; auth login uses form data (`OAuth2PasswordRequestForm`)
- Route-level rate limits:
  - AI endpoints: `AI_RATE_LIMIT`
  - AI stream endpoint: `AI_STREAM_RATE_LIMIT`
  - Trip execution mutation endpoints: `EXECUTION_RATE_LIMIT`
- Error style: `HTTPException` with `detail` string

## Auth Endpoints (`/v1/auth/*`)

### `POST /v1/auth/register`

- Request: `UserCreate` (`email`, `password`, optional `display_name`)
- Response: `UserResponse`
- Notes:
  - returns `400` if email already registered

### `POST /v1/auth/login`

- Request: form body (`username`, `password`)
- Response: `Token` (`access_token`, `refresh_token`, `token_type`, `expires_in_seconds`)
- Notes:
  - returns `401` for wrong credentials
  - returns `403` if email is not verified

### `POST /v1/auth/refresh`

- Request: `RefreshTokenRequest` (`refresh_token`)
- Response: `Token`
- Notes:
  - returns `401` for invalid refresh token
  - returns `403` if user email is not verified

### Password reset and email verification

- `POST /v1/auth/password-reset/request`
  - request: `{ email }`
  - response: `PasswordResetRequestResponse` with `reset_url` when applicable
- `GET /v1/auth/password-reset/validate?token=...`
  - response: `{ valid, email? }`
- `POST /v1/auth/password-reset/confirm`
  - request: `{ token, password }`
  - response: `204`
- `POST /v1/auth/email-verification/request`
  - request: `{ email }`
  - response: `EmailVerificationRequestResponse` with `verification_url` when applicable
- `GET /v1/auth/email-verification/validate?token=...`
  - response: `{ valid, email? }`
- `POST /v1/auth/email-verification/confirm`
  - request: `{ token }`
  - response: `204`

### `GET /v1/auth/me`

- Auth required
- Response: current `UserResponse`

## Trip Endpoints (`/v1/trips/*`)

### Core CRUD

- `POST /v1/trips/` -> `201`, `TripResponse`
- `GET /v1/trips/` -> `TripResponse[]`
- `GET /v1/trips/{trip_id}` -> `TripResponse`
- `PATCH /v1/trips/{trip_id}` -> `TripResponse`
- `DELETE /v1/trips/{trip_id}` -> `204`

Behavior notes:

- Trip destination is normalized by schema validators (`app/schemas/trip.py`)
- Date ordering is validated (`end_date >= start_date`)
- Access control is membership-based via `TripAccessService`

### Workspace support

- `GET /v1/trips/summaries` -> `TripSummaryResponse[]`
- `GET /v1/trips/{trip_id}/members` -> `TripMemberResponse[]`
- `GET /v1/trips/{trip_id}/member-readiness` -> `TripMemberReadinessResponse`
- `POST /v1/trips/{trip_id}/workspace/last-seen` -> `WorkspaceLastSeenResponse`

### On-trip snapshot

- `GET /v1/trips/{trip_id}/on-trip-snapshot?tz=<IANA timezone optional>`
- Response: `TripOnTripSnapshotResponse`
- Key response fields:
  - `mode`: `active | inactive`
  - `read_only`: whether execution writes should be hidden/disabled in UI
  - `today`, `next_stop`
  - `today_stops`, `today_unplanned`
  - `blockers`

Behavior notes:

- `tz` is optional; invalid or missing values fall back to server date
- Snapshot overlays execution log state (`execution_status`) on saved itinerary stops

## Trip Membership and Invite Endpoints

### Membership

- `POST /v1/trips/{trip_id}/members` -> `201`, `TripMemberResponse`
- Owner-only action
- Typical errors:
  - `404` user not found
  - `409` user already a member

### Invite creation and acceptance

- `POST /v1/trips/{trip_id}/invites` -> `201`, `TripInviteCreateResponse` (includes `invite_url`)
- `GET /v1/trip-invites/{token}` -> `TripInviteDetailResponse` (no auth dependency in route)
- `POST /v1/trip-invites/{token}/accept` -> `TripInviteAcceptResponse` (auth required)

Typical errors:

- `404` invite not found
- `410` invite expired
- `409` invite already accepted
- `403` accepting user email does not match invite email

## Trip Execution Endpoints

Mounted under `/v1/trips/{trip_id}/execution/*`.

### `POST /v1/trips/{trip_id}/execution/stop-status`

- Request: `TripStopStatusUpdateRequest` (`stop_ref`, `status`)
- Response: `201`, `TripExecutionEventResponse`
- Behavior:
  - validates trip membership
  - validates `stop_ref` belongs to current saved itinerary
  - latest status per stop is used when snapshot is rebuilt

### `POST /v1/trips/{trip_id}/execution/unplanned-stop`

- Request: `TripUnplannedStopRequest`
  - `day_date`, `title`, optional `time`, `location`, `notes`, `client_request_id`
- Response: `201`, `TripExecutionEventResponse`
- Behavior:
  - title cannot be blank (schema validation)
  - optional `client_request_id` enables idempotent replay for retried requests

### `DELETE /v1/trips/{trip_id}/execution/events/{event_id}`

- Response: `204`
- Behavior:
  - only event creator or trip owner can delete
  - returns `404` if event does not exist for trip

## AI Endpoints (`/v1/ai/*`)

### Planning and streaming

- `POST /v1/ai/plan` -> `ItineraryResponse`
- `POST /v1/ai/plan-smart` -> `ItineraryResponse`
- `GET /v1/ai/stream/{trip_id}` -> SSE stream
  - event types documented in route: `token`, `complete`, `error`

Behavior notes:

- `/plan` and `/plan-smart` do not persist itinerary by themselves
- `/stream/{trip_id}` returns `text/event-stream`

### Apply, read saved itinerary, refine

- `POST /v1/ai/apply`
  - request: `AIApplyRequest` (`trip_id`, `itinerary`, optional `source`)
  - response: `{ message, trip_id }` with `200`
- `GET /v1/ai/trips/{trip_id}/itinerary` -> `ItineraryResponse`
- `POST /v1/ai/refine` -> `ItineraryResponse`

Behavior notes:

- `regenerate_day_number` is required by `/refine` and returns `400` when missing
- `LLM_PROVIDER` controls Ollama vs Gemini client selection in `ItineraryService`
- Fallback path to vector-store itinerary knowledge is implemented when AI is unavailable (`knowledge_base_fallback` source)

## Logistics Endpoints

All require auth and trip membership.

### Packing (`/v1/trips/{trip_id}/packing/*`)

- `GET /` -> `PackingItemResponse[]`
- `GET /suggestions` -> `PackingSuggestionResponse[]`
- `POST /` -> `201`, `PackingItemResponse`
- `PATCH /{item_id}` -> `PackingItemResponse`
- `DELETE /{item_id}` -> `204`

Behavior note:

- list and writes are member-scoped (per `TripMemberState`), not globally shared per trip

### Budget (`/v1/trips/{trip_id}/budget/*`)

- `GET /` -> `BudgetResponse`
- `PATCH /limit` -> `BudgetResponse`
- `POST /expenses` -> `201`, `BudgetExpenseResponse`
- `PATCH /expenses/{expense_id}` -> `BudgetExpenseResponse`
- `DELETE /expenses/{expense_id}` -> `204`

Behavior note:

- budget data is member-scoped (per `TripMemberState`)

### Reservations (`/v1/trips/{trip_id}/reservations/*`)

- `GET /` -> `ReservationResponse[]`
- `POST /` -> `201`, `ReservationResponse`
- `PATCH /{reservation_id}` -> `ReservationResponse`
- `DELETE /{reservation_id}` -> `204`

Behavior notes:

- reservations are trip-level/shared
- budget sync for a reservation is per member-state and controlled by `sync_to_budget`

### Prep (`/v1/trips/{trip_id}/prep/*`)

- `GET /` -> `PrepItemResponse[]`
- `POST /` -> `201`, `PrepItemResponse`
- `PATCH /{prep_item_id}` -> `PrepItemResponse`
- `DELETE /{prep_item_id}` -> `204`

Behavior note:

- prep data is member-scoped (per `TripMemberState`)

## Matching Endpoints (`/v1/matching/*`)

- `POST /profile` -> `201`, `TravelProfileResponse`
- `GET /profile` -> `TravelProfileResponse`
- `POST /requests` -> `201`, `OpenMatchRequestResponse`
- `GET /requests` -> `MatchRequestResponse[]`
- `DELETE /requests/{id}` -> `204`
- `GET /requests/{id}/matches` -> `MatchResultResponse[]`
- `PUT /requests/{id}/matches/{match_result_id}/interaction` -> `MatchResultResponse`

Notable error behavior from service layer:

- `422` when travel profile is missing during open request
- `409` when open request already exists for same trip
- `403`/`404` for unauthorized or missing request/result

## Search Endpoints (`/v1/search/*`)

- `GET /flights` -> `FlightSearchResult`
- `GET /inspirations` -> `InspirationResult`
- `GET /explore-destinations` -> `ExploreDestinationsResult`

Behavior notes:

- `/flights` and `/inspirations` use Amadeus sandbox data and can return `503` when integration errors occur
- `/explore-destinations` returns curated data from route constants in `app/api/v1/routes/search.py`

## Destination Endpoints (`/v1/destinations/*`)

- `GET /search?q={query}` -> `DestinationSearchResult[]`

Behavior notes:

- `/search` uses OpenStreetMap Nominatim directly from the backend with no API key or Expo environment variable required.
- Provider results are normalized to `displayName`, coordinates, country, countryCode, region, and `source: "nominatim"`.
- Provider/network failures return `503` with a clean client-facing detail.

## Known API Gaps to Confirm

- If additional non-`/v1/*` routes are expected, verify in code. Current app mounting in `app/main.py` only includes `/v1/*` route modules.

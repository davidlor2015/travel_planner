# Architecture

This document describes the current high-level architecture of the `travel-planner` repository.

## System Overview

```text
Web (ui/) and Mobile (ui-mobile/)
            |
            | HTTPS JSON + SSE
            v
FastAPI app (app/main.py) with /v1/* routes
            |
            +--> Service layer (app/services/*)
            |
            +--> Repository layer (app/repositories/*)
            |
            v
SQLAlchemy models + PostgreSQL (app/models/*, app/db/*)
            |
            +--> AI providers (Ollama or Gemini) via app/services/llm/*
```

## Frontend Architecture

### Web frontend (`ui/`)
- Entry and routing are defined in `ui/src/App.tsx`.
- App shell navigation and protected app routes are split between:
  - public routes (`/`, `/login`, `/register`, reset/verify pages),
  - authenticated routes under `/app/*`.
- Feature code is organized by domain under `ui/src/features/*` (trips, matching, archive, profile, auth, explore).
- Shared infrastructure is under `ui/src/shared/*`:
  - API client and typed request wrappers (`ui/src/shared/api/client.ts`, `ui/src/shared/api/*.ts`),
  - session storage (`ui/src/shared/auth/session.ts`),
  - analytics (`ui/src/shared/analytics.ts`),
  - shared UI primitives.
- Workspace state orchestration on web is centralized in `ui/src/features/trips/list/useTripWorkspaceModel.ts` (trip selection, AI draft state, apply/regenerate flow, summaries, and workspace tabs).

### Mobile frontend (`ui-mobile/`)
- Routing uses Expo Router under `ui-mobile/app/*`.
- Root tab layout is in `ui-mobile/app/(tabs)/_layout.tsx`.
- Auth/session lifecycle is managed by `ui-mobile/providers/AuthProvider.tsx`.
- Query state is managed by TanStack Query in `ui-mobile/providers/QueryProvider.tsx`.
- API access goes through `ui-mobile/shared/api/client.ts`.
- Token storage uses platform-aware storage (`SecureStore` on native, AsyncStorage-backed path on web) in `ui-mobile/shared/auth/tokenStorage.ts`.
- Workspace composition is in `ui-mobile/features/trips/workspace/WorkspaceScreen.tsx` with hook-backed orchestration from `ui-mobile/features/trips/workspace/useTripWorkspaceModel.ts`.

## Backend Architecture

- App bootstrap is in `app/main.py`.
- Cross-cutting middleware and handlers:
  - CORS middleware (`CORSMiddleware` configured from `CORS_ORIGINS`),
  - IP-based rate limiting via `slowapi` (`app/core/limiter.py`),
  - request logging + counters (`app/api/middleware/request_metrics.py`),
  - global exception handling (`app/api/middleware/error_handler.py`).
- API layer is split by route module in `app/api/v1/routes/*`.
- Route handlers are thin and delegate to service classes in `app/services/*`.
- Service layer uses repositories in `app/repositories/*` for persistence.
- SQLAlchemy models in `app/models/*` define database entities and relationships.

## Database Architecture

- SQLAlchemy engine/session are configured in `app/db/session.py`.
- Base metadata lives in `app/db/base_class.py` and `app/db/base.py`.
- Schema migrations are managed with Alembic in `alembic/`.

Core entity groups in `app/models/*`:
- Identity and access: `user.py`, `trip_membership.py`, `trip_invite.py`.
- Trip core: `trip.py`.
- Itinerary plan: `itinerary.py` (`ItineraryDay`, `ItineraryEvent`, `ItineraryDayAnchor`).
- On-trip execution log: `trip_execution_event.py` (append-only execution events).
- Logistics: `budget_expense.py`, `packing_item.py`, `reservation.py`, `prep_item.py`.
- Matching/discovery: `travel_profile.py`, `match_request.py`, `match_result.py`, `match_interaction.py`, `explore_destination.py`.

Data-shape note:
- The current code keeps planned itinerary data and execution events as separate persistence concerns (planned rows in itinerary tables, real-time execution history in `trip_execution_events`).

## API Architecture

- API versioning is currently under `/v1/*` (registered in `app/main.py`).
- Route groups include:
  - `/v1/auth/*`
  - `/v1/trips/*`
  - `/v1/trips/{trip_id}/execution/*`
  - `/v1/ai/*`
  - `/v1/matching/*`
  - `/v1/search/*`
  - `/v1/trip-invites/*`
  - `/v1/trips/{trip_id}/packing/*`
  - `/v1/trips/{trip_id}/budget/*`
  - `/v1/trips/{trip_id}/reservations/*`
  - `/v1/trips/{trip_id}/prep/*`
- Request/response contracts are defined with Pydantic schemas in `app/schemas/*`.
- Frontends use typed API modules (`ui/src/shared/api/*`, `ui-mobile/features/*/api.ts`, `ui-mobile/shared/api/*`) rather than inline fetch calls in render components.

## Auth Architecture

Backend auth flow:
- OAuth2 bearer dependency is defined in `app/api/deps.py`.
- Login and refresh endpoints are in `app/api/v1/routes/auth.py`.
- Auth logic is implemented in `app/services/auth_service.py`.
- Password hashing and token creation/verification are in `app/core/security.py`.

Token model:
- Access, refresh, password-reset, and email-verification tokens are JWTs with token type claims (`type`).
- Access token is validated in `get_current_user` (`app/api/deps.py`) before route-level business logic.

Frontend session handling:
- Web stores tokens in localStorage (`ui/src/shared/auth/session.ts`) and auto-refreshes on 401 in `ui/src/shared/api/client.ts`.
- Mobile stores tokens via `tokenStorage` and also performs refresh-on-401 in `ui-mobile/shared/api/client.ts`.

## AI Architecture

Backend AI entry points:
- AI routes are in `app/api/v1/routes/ai.py`:
  - plan (`/v1/ai/plan`)
  - streaming plan (`/v1/ai/stream/{trip_id}`)
  - apply (`/v1/ai/apply`)
  - refine (`/v1/ai/refine`)
  - saved itinerary fetch (`/v1/ai/trips/{trip_id}/itinerary`)
  - rule-based plan path (`/v1/ai/plan-smart`)

AI service orchestration:
- `app/services/ai/itinerary_service.py` orchestrates generation, streaming, refine, apply, and retrieval.
- Provider selection is configuration-driven (`LLM_PROVIDER`) through `_make_llm_client()`.
- Provider clients:
  - Ollama client: `app/services/llm/ollama_client.py`
  - Gemini client: `app/services/llm/gemini_client.py`
- There is also a rule-based itinerary path in `app/services/ai/rule_based_service.py`.

Frontend AI integration:
- Web SSE streaming hook: `ui/src/shared/hooks/useStreamingItinerary.ts`.
- Mobile SSE streaming hook: `ui-mobile/features/ai/useStreamingItinerary.ts`.
- Apply/refine/fetch API contracts on web: `ui/src/shared/api/ai.ts`.

## Workspace Architecture

The workspace is implemented as a layered flow across frontend + backend.

Frontend workspace orchestration:
- Web: `ui/src/features/trips/list/useTripWorkspaceModel.ts` is the central orchestration layer for trip workspace behavior.
- Mobile: `ui-mobile/features/trips/workspace/useTripWorkspaceModel.ts` provides the mobile workspace view model used by `WorkspaceScreen.tsx`.
- Both surfaces keep UI components thinner by placing orchestration in hooks/adapters.

Backend workspace service surface:
- Primary workspace routes are in `app/api/v1/routes/trips.py` (trip details, summaries, members, readiness, on-trip snapshot, invites, workspace last-seen).
- Core logic is in `app/services/trip_service.py`.
- Access and permission gating is centralized in `app/services/trip_access_service.py`.
- On-trip write operations are handled separately by `app/services/trip_execution_service.py`.

Planned itinerary vs live execution behavior:
- Planned itinerary persistence flows through itinerary repositories/services.
- Execution actions (stop status updates, unplanned stops) append to execution events and are merged into snapshot responses.
- This design is documented in code comments and implementation in:
  - `app/services/trip_execution_service.py`
  - `app/models/trip_execution_event.py`
  - `app/services/trip_service.py`

## Notes

- This document is based on current repository structure and code paths.
- For low-level behavioral details (field-level semantics, edge cases, and fallback behavior), verify in code.

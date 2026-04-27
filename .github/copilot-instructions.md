# Copilot instructions for Waypoint

## Build, test, and lint commands

Run from `travel-planner/` unless noted.

### Root wrappers (preferred for full-stack checks)
- `make test` — backend + web (Vitest) + mobile (Jest)
- `make test-backend`
- `make test-web`
- `make test-mobile`
- `make lint` — backend Ruff + web ESLint + mobile Expo lint
- `make lint-backend`
- `make lint-web`
- `make lint-mobile`
- `make dev-backend` (FastAPI on `:8000`)
- `make dev-web` (Vite on `:5173`)
- `make dev-mobile` (Expo)

### Backend (`travel-planner/`)
- `pytest tests/ -v`
- Single file: `pytest tests/unit/test_auth_unit.py -v`
- Single test selection: `pytest tests/ -k "test_name_fragment" -v`
- Lint: `.venv/bin/ruff check app/ tests/ && .venv/bin/ruff format --check app/ tests/`

### Web (`travel-planner/ui/`)
- `npm run dev`
- `npm run build` (TypeScript check + Vite build)
- `npm run lint`
- `npm run test`
- Single Vitest file: `npx vitest run src/features/trips/itinerary/itineraryDraftMutations.test.ts`
- E2E: `npm run test:e2e`
- Single Playwright spec: `npx playwright test e2e/auth.spec.ts`

### Mobile (`travel-planner/ui-mobile/`)
- `npm run start` (or `npx expo start`)
- `npm run lint`
- `npm run test`
- Single Jest file: `npx jest __tests__/workspace/RegenerateSheet.test.tsx`

## High-level architecture

Waypoint is a three-surface system sharing one backend:

- **Web (`ui/`)**: full planning workspace (trip creation, itinerary editing, logistics, collaboration, matching, archive, profile, optional explore)
- **Mobile (`ui-mobile/`)**: execution-focused and lightweight management
- **Backend (`app/`)**: FastAPI `/v1/*` API, SQLAlchemy persistence, AI itinerary orchestration

Core backend layering:

1. Route modules in `app/api/v1/routes/*` stay thin.
2. Business logic lives in `app/services/*`.
3. Persistence is handled by repositories in `app/repositories/*` over SQLAlchemy models in `app/models/*`.

Important cross-cutting flows:

- **Trip authorization gate** is centralized in `TripAccessService.require_membership(...)` (`app/services/trip_access_service.py`). Trip features should use this gate instead of ad hoc permission checks.
- **Itinerary planning vs on-trip execution are separate persistence paths**:
  - planned itinerary uses itinerary tables/services
  - live updates append execution events (`trip_execution_event`) and are merged into snapshots
- **AI itinerary flow** is centered on `app/api/v1/routes/ai.py` + `app/services/ai/itinerary_service.py`:
  - generate (`/v1/ai/plan` or `/v1/ai/plan-smart`)
  - stream (`/v1/ai/stream/{trip_id}`; SSE events: `token`, `complete`, `error`)
  - refine (`/v1/ai/refine`)
  - apply (`/v1/ai/apply`)

Frontend integration pattern:

- Web and mobile both use shared API client layers with auth-token refresh behavior; avoid inline fetch logic in UI render components.
- SSE itinerary streaming is handled by dedicated hooks (`ui/src/shared/hooks/useStreamingItinerary.ts`, `ui-mobile/features/ai/useStreamingItinerary.ts`) rather than component-local stream code.

## Key conventions for this repository

- Keep route handlers thin; put decision logic in services and data access in repositories.
- For trip-scoped backend work, use `TripAccessService` as the single permission boundary.
- In web/mobile frontends, keep components presentation-focused; move orchestration and derived state into hooks/adapters/model helpers.
- In web frontend, route all HTTP through `ui/src/shared/api/*` and shared client helpers; do not introduce one-off request paths inside components.
- In mobile frontend, do not add mock production data; use backend data + explicit loading/empty/error states.
- Mobile product intent is execution-first: avoid shifting heavy planning/editor workflows from web to mobile unless explicitly requested.

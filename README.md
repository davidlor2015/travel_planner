# Waypoint

Waypoint is a full-stack travel planning project with:
- a web workspace in `ui/` for planning and coordination,
- a mobile app in `ui-mobile/` for trip execution and lightweight management,
- a FastAPI backend in `app/` with PostgreSQL persistence and AI-assisted itinerary flows.

## Main Project Overview

### Current scope
- Auth: register, login, refresh token, password reset, email verification, current user
- Trips: create/list/update/delete trips, summaries, members, invites, readiness, on-trip snapshot
- Itinerary AI: generate, stream, refine, and apply itinerary drafts
- Logistics: reservations, budget, packing, prep items
- On-trip execution: stop status updates and unplanned stop logging
- Matching: travel profile, match requests, match results, interaction state
- Search/explore APIs: flights, inspirations, curated explore destinations

### Platform surfaces
- Web (`ui/`): landing/auth, trips/workspace, matching, archive, profile, optional explore route (`VITE_ENABLE_EXPLORE`)
- Mobile (`ui-mobile/`): auth flow, tabs (Trips, Archive, Profile, Companions, optional Explore), trip workspace, and live on-trip screen

## Contributor/Copilot guardrails

- Scope source of truth: `V1_SCOPE.md`
- Implementation checklist: `COPILOT_CHECKLIST.md`
- Agent-specific constraints: `AGENTS.md`

## Screenshots


## Tech Stack

### Backend
- Python 3.11
- FastAPI (`fastapi==0.128.0`)
- SQLAlchemy (`SQLAlchemy==2.0.46`)
- Alembic (`alembic==1.18.3`)
- PostgreSQL (`psycopg2-binary==2.9.9`)
- Pydantic v2 (`pydantic==2.12.5`, `pydantic-settings==2.12.0`)
- slowapi (`slowapi==0.1.9`) for rate limiting
- Sentry SDK (`sentry-sdk==2.58.0`) optional monitoring

### Web app (`ui/`)
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Vitest and Playwright

### Mobile app (`ui-mobile/`)
- Expo + React Native
- Expo Router
- NativeWind
- TanStack Query
- Jest (`jest-expo`)

### AI and integrations
- Ollama (default local provider via `LLM_PROVIDER=ollama`)
- Gemini (cloud provider via `LLM_PROVIDER=gemini`)
- Amadeus (optional flight/inspiration search)
- OpenTripMap (optional destination enrichment)

## Architecture

```text
ui/ (React + Vite)          \
                             \ HTTP API
ui-mobile/ (Expo RN)        /  /v1/* routes
                            /
app/ (FastAPI services) --> PostgreSQL
                       --> Ollama or Gemini
```

## Repository Layout

```text
travel-planner/
├── app/                  # FastAPI API, services, models, schemas
├── alembic/              # Database migrations
├── ui/                   # React web app
├── ui-mobile/            # Expo React Native app
├── tests/                # Backend unit + integration tests
├── scripts/              # Backend helper scripts (seed, etc.)
├── docs/                 # Project docs
└── Makefile              # Unified dev/test/lint commands
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js and npm
- PostgreSQL

### 1) Backend environment

```bash
make setup
```

### 2) Environment variables
- Fill a root `.env` file using `.env.example` as reference.
- `JWT_SECRET` is required and must be at least 32 characters.
- `.env.example` includes this helper command:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3) Run migrations

```bash
make migrate
```

### 4) Start apps
Run each in its own terminal:

```bash
make dev-backend
make dev-web
make dev-mobile
```

Default local endpoints:
- Backend: `http://localhost:8000`
- Web: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`

## Commands

### Root `Makefile`

```bash
make help
make setup
make migrate
make seed
make gen-types
make dev-backend
make dev-web
make dev-mobile
make test
make test-backend
make test-web
make test-mobile
make lint
make lint-backend
make lint-web
make lint-mobile
make docker-up
make docker-down
make docker-build
```

### Web (`ui/`)

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run preview
npm run gen:types
```

### Mobile (`ui-mobile/`)

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run test
```

## Feature Summary

### API routes
- `/v1/auth/*` for auth and identity
- `/v1/trips/*` for trip CRUD, members, summaries, readiness, and snapshots
- `/v1/trips/{trip_id}/execution/*` for on-trip execution events
- `/v1/ai/*` for plan, stream, refine, and apply itinerary flows
- `/v1/matching/*` for companion matching
- `/v1/search/*` for flights, inspirations, and explore destinations
- `/v1/trip-invites/*` for invite acceptance
- `/v1/trips/{trip_id}/packing/*`
- `/v1/trips/{trip_id}/budget/*`
- `/v1/trips/{trip_id}/reservations/*`
- `/v1/trips/{trip_id}/prep/*`

### Behavior notes
- `/v1/search/flights` and `/v1/search/inspirations` use Amadeus sandbox behavior.
- `/v1/search/explore-destinations` currently returns curated destination payloads from backend route data.
- Additional runtime behavior should be confirmed in code when changing API assumptions.

## Docker

`docker-compose.yml` defines:
- `db` (PostgreSQL 15)
- `backend` (FastAPI service)
- `frontend` (web app)

Use:

```bash
make docker-up
make docker-down
make docker-build
```

## Testing

Use root targets for full-suite or layer-specific runs:

```bash
make test
make test-backend
make test-web
make test-mobile
```

If local test status is uncertain, current behavior should be confirmed by running these commands.

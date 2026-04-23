# Waypoint

A full-stack collaborative travel planning app with AI-assisted itinerary generation, live trip execution, and companion matching. Built with FastAPI, PostgreSQL, and React 19.

## Why I built this

I wanted to explore a harder product problem than simple itinerary generation: how to make trip planning feel collaborative, editable, and dependable once multiple people are involved.

A few decisions shaped the architecture early on. I abstracted the LLM provider so itinerary generation was not tightly coupled to a single model or vendor — switching between local inference (Ollama) and a cloud provider (Gemini) requires no product logic changes, just a config value. I also pulled the trip workspace into a centralized orchestration layer so collaborative state, drafts, derived readiness, and UI actions stay consistent instead of being scattered across page components.

For the companion matching feature, I did not want a black-box result. I designed a weighted scoring system around factors like destination overlap, date overlap, budget range, interests, and travel style, with a breakdown that can actually be explained to the user. The interesting part of the project for me was less "calling AI" and more designing the surrounding system so the app still behaves predictably when real product complexity shows up.

## Features

- **Collaborative trip workspaces** — shared day-by-day itineraries with add, reorder, and inline editing of stops
- **AI itinerary generation** — LLM generates a structured plan; user reviews and applies it explicitly rather than having it overwrite their data automatically
- **Live execution mode** — real-time stop tracking with status updates and unplanned stop logging during an active trip
- **Trip logistics** — packing lists, budget tracking, reservations, prep checklists, and group chat, all scoped to a trip
- **Companion matching** — profile-based compatibility scoring with a transparent breakdown of each match factor
- **Destination exploration** — mood and interest-based filtering for destination discovery
- **Past trip archive** — browsable history with aggregate travel stats
- **Auth and isolation** — JWT-based authentication with strict per-user data scoping throughout the backend

## Tech stack

**Backend** — Python 3.11, FastAPI, SQLAlchemy, Alembic, Pydantic v2, PostgreSQL, slowapi (rate limiting), Sentry (optional monitoring)

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Vitest, Playwright

**AI** — Ollama (local, default `qwen2.5:14b`) or Gemini 2.0 Flash, switchable via `LLM_PROVIDER` config

**Integrations** — Amadeus API (travel search, optional), OpenTripMap (destination data, optional)

## Architecture

```
React (ui/)  →  FastAPI (app/)  →  PostgreSQL + Ollama / Gemini
```

- All HTTP calls from the frontend go through typed client functions in `ui/src/shared/api/`
- Backend routes are versioned under `/v1/*` and delegate to a service layer — routes stay thin
- The LLM provider is behind an interface in `app/services/llm/` — `ollama_client.py` and `gemini_client.py` are interchangeable
- Trip workspace state is orchestrated through a single model hook rather than distributed across components
- Matching scores are computed in `app/services/compatibility_scorer.py` with a per-factor breakdown returned alongside the result

## Repository layout

```
travel-planner/
├── app/
│   ├── api/v1/routes/      # Route handlers: auth, trips, ai, matching, search, invites, execution
│   ├── core/               # Config, security, rate limiting, logging, monitoring
│   ├── db/                 # Session and base setup
│   ├── models/             # SQLAlchemy ORM models
│   ├── repositories/       # Data access layer
│   ├── schemas/            # Pydantic request/response schemas
│   └── services/           # Business logic, LLM clients, matching scorer, execution
├── alembic/                # Migrations
├── tests/
│   ├── unit/
│   └── integration/
└── ui/src/
    ├── features/
    │   ├── trips/          # Workspace, itinerary editor, logistics, map, live execution
    │   ├── matching/       # Companion matching profile and requests
    │   ├── explore/        # Destination discovery
    │   ├── archive/        # Past trips
    │   ├── profile/        # User profile and travel stats
    │   └── auth/           # Login, registration, password reset
    └── shared/             # API clients, hooks, UI primitives, auth utilities
```

## Quick start

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL, Ollama or a Gemini API key

### Backend

```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Runs at `http://localhost:8000` — interactive docs at `/docs`.

### Frontend

```bash
cd ui
npm install
npm run dev
```

Runs at `http://localhost:5173`.

## Configuration

Create a `.env` file in the project root. Required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (default: PostgreSQL at localhost) |
| `JWT_SECRET` | Signing key — must be at least 32 characters |
| `JWT_ALG` | Algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: `14` |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: `http://localhost:5173`) |
| `LLM_PROVIDER` | `ollama` or `gemini` (default: `ollama`) |
| `OLLAMA_BASE_URL` | Default: `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Default: `qwen2.5:14b` |
| `OLLAMA_TIMEOUT_SECONDS` | Default: `60` |
| `GEMINI_API_KEY` | Required when `LLM_PROVIDER=gemini` |
| `GEMINI_MODEL` | Default: `gemini-2.0-flash` |
| `AI_RATE_LIMIT` | Default: `10/minute` |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | Optional — enables travel search |
| `OPENTRIPMAP_API_KEY` | Optional — enables destination enrichment |
| `SENTRY_DSN` | Optional — enables error monitoring |

Frontend (`ui/.env`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (defaults to `http://localhost:8000`) |

## Commands

**Backend**

```bash
uvicorn app.main:app --reload    # dev server
alembic upgrade head             # apply migrations
pytest tests/ -v                 # all tests
pytest tests/unit/ -v            # unit tests
pytest tests/integration/ -v     # integration tests
```

**Frontend** (from `ui/`)

```bash
npm run dev          # dev server
npm run build        # type-check and bundle
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
```

## API surface

```
/v1/auth/...
/v1/trips/...
/v1/trips/{trip_id}/packing/...
/v1/trips/{trip_id}/budget/...
/v1/trips/{trip_id}/reservations/...
/v1/trips/{trip_id}/prep/...
/v1/ai/plan
/v1/ai/apply
/v1/matching/...
/v1/search/...
/v1/trip-invites/...
```

Full schemas available at `/docs` when the backend is running.

## Troubleshooting

**Backend won't start** — confirm the virtual environment is active, `DATABASE_URL` and `JWT_SECRET` are set, and migrations have been applied with `alembic upgrade head`.

**Frontend can't reach the backend** — check that the backend is running on port 8000 and that `VITE_API_URL` in `ui/.env` matches. Restart `npm run dev` after env changes.

**AI generation fails or times out** — for Ollama, confirm the server is running (`ollama serve`) and the model is pulled locally (`ollama pull qwen2.5:14b`). For Gemini, verify the API key and model name. Raise `OLLAMA_TIMEOUT_SECONDS` on slower hardware.

**CORS errors** — add your frontend origin to `CORS_ORIGINS` in `.env` and restart the backend.

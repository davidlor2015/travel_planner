# Waypoint

Waypoint is a full-stack travel planning app with collaborative trip workspaces, AI-assisted itinerary generation, and practical trip management tools.

## Highlights

- Collaborative trip workspace with editable day/stop itineraries
- AI itinerary generation and apply flow
- Authentication + per-user data isolation
- Trip operations: invites, reservations, prep tracking
- Supporting workflows: packing, budget, search, matching
- Modern React + TypeScript frontend, FastAPI backend

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, Uvicorn
- Frontend: React 19, TypeScript, Vite, Tailwind v4, Framer Motion
- Data: relational DB via SQLAlchemy (configured by `DATABASE_URL`)
- AI/Integrations: Ollama (configurable), optional external travel/search providers

## Architecture

```text
React (ui/)  ->  FastAPI (app/)  ->  Database + AI/External Providers
```

- Frontend talks to backend over typed API clients in `ui/src/shared/api/`.
- Backend routes are versioned under `/v1/*`.
- Workspace editing logic is kept in model/hooks + pure helper transforms.

## Repository Layout

```text
travel-planner/
├─ app/                # FastAPI backend
│  ├─ api/v1/routes/   # Route modules (auth, trips, ai, search, invites, etc.)
│  ├─ core/            # Config, security, logging, limiter, monitoring
│  ├─ models/          # SQLAlchemy models
│  ├─ schemas/         # Pydantic request/response schemas
│  ├─ repositories/    # DB access layer
│  └─ services/        # Business logic
├─ alembic/            # Migrations
├─ tests/              # Backend tests
└─ ui/                 # React frontend
   ├─ src/features/    # Feature-first UI modules
   ├─ src/shared/      # Shared API clients/hooks/ui
   └─ package.json
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Database reachable by `DATABASE_URL`

### 1) Backend

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000` (docs at `http://localhost:8000/docs`).

### 2) Frontend

```bash
cd ui
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Configuration

Create `.env` values for backend settings (for example):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALG`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`
- `AI_RATE_LIMIT`

Frontend:

- `VITE_API_URL` (defaults to local backend if unset in app config)

## Commands

### Backend

- Run API: `uvicorn app.main:app --reload`
- Migrate DB: `alembic upgrade head`
- Tests: `pytest tests/ -v`

### Frontend

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`

## API Surface (High-Level)

Mounted route groups in `app/main.py`:

- `/v1/auth`
- `/v1/trips`
- `/v1/matching`
- `/v1/ai`
- `/v1/search`
- `/v1/trip-invites`
- `/v1/trips/{trip_id}/packing`
- `/v1/trips/{trip_id}/budget`
- `/v1/trips/{trip_id}/reservations`
- `/v1/trips/{trip_id}/prep`

See interactive docs at `/docs` for request/response details.

## Current Product Scope

- Overview itinerary editing is manual-first: add/edit/delete/reorder stops within a day.
- Cross-day stop editing is intentionally out of scope for the current slice.
- Lightweight stop ownership metadata (`handledBy` / `bookedBy`) is supported via the existing stop notes field.
- Stop status is lightweight and limited to `planned`, `confirmed`, and `skipped`.
- Keep business logic in hooks/helpers and render components thin.

## Troubleshooting

### Backend won't start

- Ensure virtual environment is active and dependencies are installed: `pip install -r requirements.txt`.
- Verify required env vars are set (especially `DATABASE_URL`, `JWT_SECRET`).
- Apply migrations: `alembic upgrade head`.

### Frontend can't reach backend

- Confirm backend is running on `http://localhost:8000`.
- Check `VITE_API_URL` in frontend env/config.
- Restart `npm run dev` after env changes.

### AI itinerary generation fails or times out

- Verify Ollama is running and reachable from `OLLAMA_BASE_URL`.
- Confirm `OLLAMA_MODEL` exists locally.
- Increase `OLLAMA_TIMEOUT_SECONDS` if needed for slower local hardware.

### Lint/test/build discrepancies

- Run commands from the correct directory (`ui/` for frontend, repo root for backend tests).
- Frontend checks:
  - `npm run test`
  - `npm run build`
  - `npm run lint`
- Backend checks:
  - `pytest tests/ -v`



# Deployment

This document describes current deployment-related behavior in this repository based on existing files and commands.

## What Is Deployed

- Backend API: FastAPI service in `app/`
- Web frontend: React/Vite app in `ui/`
- Database: PostgreSQL (primary runtime path in repo)
- Mobile app: Expo app in `ui-mobile/` (release hosting pipeline is not defined in this repo)

## Frontend (Web) Deployment

### Build and runtime shape

- The web app is built from `ui/` with Vite.
- API base URL is read from `VITE_API_URL` in [`ui/src/app/config.ts`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/src/app/config.ts).
- Default API URL fallback is `http://localhost:8000` when `VITE_API_URL` is not set.
- SPA routing fallback is configured both for Netlify and for nginx in Docker:
  - [`netlify.toml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/netlify.toml)
  - [`ui/nginx.conf`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/nginx.conf)

### Existing web commands

From [`ui/package.json`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/package.json):

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run preview
npm run gen:types
```

### Netlify hosting path in repo

[`netlify.toml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/netlify.toml) defines:

- `base = "ui"`
- `command = "npm install && npm run build"`
- `publish = "dist"`
- Redirect `/* -> /index.html` (status 200)

## Backend Deployment

### Build and runtime shape

- Backend container is built from root [`Dockerfile`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/Dockerfile).
- Container startup command runs migrations, then starts Uvicorn:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Local dev backend command in [`Makefile`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/Makefile):

```bash
make dev-backend
```

### API wiring

- API routes are mounted under `/v1/*` in [`app/main.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/app/main.py).
- CORS origins are loaded from `CORS_ORIGINS`.
- Sentry initializes only when `SENTRY_DSN` is set (see [`app/core/monitoring.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/app/core/monitoring.py)).

## Database

### Engine and connection source

- SQLAlchemy engine uses `DATABASE_URL` from settings in [`app/db/session.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/app/db/session.py).
- Settings are loaded from `.env` via Pydantic settings in [`app/core/config.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/app/core/config.py).

### Docker database service

[`docker-compose.yml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/docker-compose.yml) defines:

- `db` service: `postgres:15`
- Port mapping: `5432:5432`
- Persistent volume: `db_data`
- Healthcheck with `pg_isready`

## Migrations

- Alembic scripts are in `alembic/versions/`.
- Alembic uses `settings.DATABASE_URL` in [`alembic/env.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/alembic/env.py).
- Existing migration command from [`Makefile`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/Makefile):

```bash
make migrate
```

- In container runtime, migrations are also executed on backend startup by Dockerfile command.

## Environment Variables

### Backend/API variables

Primary definitions are in:

- [`app/core/config.py`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/app/core/config.py)
- [`.env.example`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/.env.example)

Core variables used by backend runtime:

- `DATABASE_URL`
- `JWT_SECRET`, `JWT_ALG`
- `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`, `EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS`, `TRIP_INVITE_EXPIRE_DAYS`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `AI_RATE_LIMIT`, `AI_STREAM_RATE_LIMIT`, `EXECUTION_RATE_LIMIT`
- `LLM_PROVIDER`
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`, `OLLAMA_NUM_PREDICT`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`
- `OPENTRIPMAP_API_KEY`
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`

### Web frontend variables

Used in web code:

- `VITE_API_URL` (API base URL)
- `VITE_ENABLE_EXPLORE` (feature gating)
- `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_TRACES_SAMPLE_RATE`
- `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`

References:

- [`ui/src/app/config.ts`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/src/app/config.ts)
- [`ui/src/instrument.ts`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/src/instrument.ts)
- [`ui/src/App.tsx`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui/src/App.tsx)

### Mobile frontend variables

Used in mobile code:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_ENABLE_EXPLORE`
- `EXPO_PUBLIC_ENABLE_MAP`

References:

- [`ui-mobile/shared/api/config.ts`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui-mobile/shared/api/config.ts)
- [`ui-mobile/app/(tabs)/_layout.tsx`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui-mobile/app/(tabs)/_layout.tsx)
- [`ui-mobile/features/trips/workspace/WorkspaceScreen.tsx`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/ui-mobile/features/trips/workspace/WorkspaceScreen.tsx)

## Hosting Paths Present In This Repo

### 1) Docker Compose stack (local/full-stack runtime)

From [`Makefile`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/Makefile):

```bash
make docker-up
make docker-down
make docker-build
```

Compose services are `db`, `backend`, and `frontend` (see [`docker-compose.yml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/docker-compose.yml)).

### 2) Netlify (web frontend static hosting)

Defined in [`netlify.toml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/netlify.toml).

### 3) GitHub Actions image publishing

[`.github/workflows/ci.yml`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/.github/workflows/ci.yml) builds and pushes backend/frontend Docker images to GHCR on `main` push after tests pass.

This workflow publishes images; runtime infrastructure that pulls and runs those images is not defined in this repo. Current behavior should be confirmed.

## Verified Commands (Root)

From [`Makefile`](/mnt/c/Users/david/desktop/planner_proj/travel-planner/Makefile):

```bash
make setup
make migrate
make dev-backend
make dev-web
make dev-mobile
make docker-up
make docker-down
make docker-build
```

## Known Gaps / Verify In Code

- `.env.docker.example` currently shows a MySQL `DATABASE_URL`, while `docker-compose.yml` provisions PostgreSQL and `.env.example` uses PostgreSQL. Current behavior should be confirmed before using `.env.docker.example` as source-of-truth.
- `README.md` lists Python 3.11 in prerequisites, while `Dockerfile`, `runtime.txt`, and CI use Python 3.12. Current behavior should be confirmed for the target host.
- No production infrastructure manifests (for example Kubernetes, ECS, Fly, Render, or Heroku Procfile) are present. Deployment target orchestration is out of scope in this repo.
- Mobile release pipeline (EAS build/submit or store deployment) is not defined in repo automation. Verify in code and external platform settings.

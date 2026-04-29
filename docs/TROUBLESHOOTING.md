# Troubleshooting

Common runtime issues for Waypoint across backend, web, mobile, database, AI, and auth.

## Scope and source of truth

- Setup/runtime commands: `README.md`, `Makefile`
- Backend config and startup wiring: `app/core/config.py`, `app/main.py`, `Dockerfile`, `docker-compose.yml`
- Migration wiring: `alembic/env.py`
- Web API client config: `ui/src/app/config.ts`, `ui/src/shared/api/client.ts`
- Mobile API client config: `ui-mobile/shared/api/config.ts`, `ui-mobile/shared/api/client.ts`
- AI behavior/fallback: `app/api/v1/routes/ai.py`, `app/services/ai/itinerary_service.py`, `app/services/vector_store.py`, `data/schema.sql`
- Auth behavior: `app/api/v1/routes/auth.py`, `app/services/auth_service.py`, `tests/integration/test_auth_api.py`

## Quick command checklist

Use commands already defined in repo docs/project files:

```bash
make setup
make migrate
make dev-backend
make dev-web
make dev-mobile
make docker-up
make docker-down
make test-backend
```

If a command fails, keep the first traceback/error line and the last error line; those are usually enough to isolate root cause.

## Backend won’t start

## 1) `JWT_SECRET` validation failure at import/startup

`Settings()` is instantiated at import time (`app/core/config.py`). Startup fails if:

- `JWT_SECRET` is missing
- shorter than 32 chars
- insecure placeholder value (for example `change-me`)

What to do:

- Fill `.env` from `.env.example`
- use the helper shown in `.env.example`/`README.md` to generate a secret
- restart backend with `make dev-backend`

## 2) Database connection errors

Backend and Alembic both use `DATABASE_URL`.

- local default in `.env.example` points at local Postgres
- Docker compose backend uses `.env.docker`

What to check:

- DB host/port/user/password/db name in `DATABASE_URL`
- Postgres is running and reachable
- if using Docker stack, run `make docker-up` and confirm DB service healthy

## 3) Environment mismatch between Docker env examples

Current repository state:

- `.env.docker` uses Postgres URL format
- `.env.docker.example` currently shows a MySQL URL

Before copying `.env.docker.example` directly, current behavior should be confirmed.

## Frontend can’t reach API

## Web (`ui/`)

- Base URL is `VITE_API_URL` fallback `http://localhost:8000` (`ui/src/app/config.ts`)
- API client hits `${API_URL}/v1/*` (`ui/src/shared/api/client.ts`)

Checks:

- backend is running on the expected host/port
- `VITE_API_URL` (if set) points to reachable backend
- browser devtools network confirms failed request URL/response code

## Mobile (`ui-mobile/`)

- preferred env var is `EXPO_PUBLIC_API_BASE_URL` (legacy alias `EXPO_PUBLIC_API_URL` is also supported)
- in Android emulator, localhost values are remapped to `10.0.2.2` automatically
- web-dev path still falls back to `http://127.0.0.1:8000`
- if native base URL env vars are missing, runtime falls back to Android emulator default (`http://10.0.2.2:8000`) in dev; otherwise config throws in native

Checks:

- set `EXPO_PUBLIC_API_BASE_URL` to reachable backend origin for device/emulator
- verify device can reach host network endpoint
- if running backend in Docker, verify published port mapping matches mobile base URL

## CORS problems

Backend CORS origins come from comma-separated `CORS_ORIGINS` in `.env` and are applied in `app/main.py`.

If browser requests fail with CORS errors:

- add exact web origin(s) to `CORS_ORIGINS`
- restart backend after env changes

## Database migration issues

## 1) Migrations fail locally

Use:

```bash
make migrate
```

Alembic uses `settings.DATABASE_URL` from `alembic/env.py`, not a separate hardcoded URL.

Common causes:

- wrong driver/scheme in `DATABASE_URL`
- DB server unavailable
- credentials/db name mismatch

## 2) App starts but schema is stale

- Docker backend command runs `alembic upgrade head` before Uvicorn (`Dockerfile`)
- local non-Docker dev requires running `make migrate` yourself

If runtime errors mention missing columns/tables, rerun migrations against the same DB your app is using.

## AI generation failures

## 1) Plan/refine endpoints return AI availability or parse errors

AI route behavior (`/v1/ai/*`):

- `/plan` and `/refine` return `400` for service/value errors
- refine requires `regenerate_day_number`
- generation can fail if LLM is unavailable or response is invalid

## 2) Ollama unavailable

When LLM is unavailable, itinerary service attempts vector fallback (`knowledge_base_fallback`) via `app/services/vector_store.py`.

Fallback also fails if vector data is missing.

What to check:

- `LLM_PROVIDER` and provider-specific env vars
- Ollama/Gemini reachability based on provider choice
- `itinerary_chunks` table exists (`data/schema.sql`)

If vector table is not present, current behavior should be confirmed before assuming fallback is available in that environment.

## 3) Search/AI-related rate limits

`AI_RATE_LIMIT` and `AI_STREAM_RATE_LIMIT` are enforced via `slowapi`. High request volume can produce `429` responses.

## Auth issues

## 1) Login fails with `403 Email not verified`

Current behavior is enforced in `AuthService.login` and integration-tested in `tests/integration/test_auth_api.py`.

Fix:

- complete email verification flow:
  - `POST /v1/auth/email-verification/request`
  - `POST /v1/auth/email-verification/confirm`

## 2) Refresh fails with `401 Invalid refresh token`

`AuthService.refresh` returns `401` for invalid/expired/malformed tokens.

Client behavior:

- web/mobile clients try one refresh on 401
- if refresh fails, stored session is cleared (`ui/src/shared/api/client.ts`, `ui-mobile/shared/api/client.ts`)

Fix:

- log in again to obtain fresh token pair

## 3) Intermittent unauthorized behavior across tabs/devices

Session refresh is token-based and client-managed. If one environment clears tokens while another is active, behavior can look inconsistent.

Current behavior should be confirmed in code if you need synchronized multi-device session semantics.

## Notes on uncertain behavior

When details are environment-specific (local OS networking, Docker networking mode, cloud deployment topology), verify in code and runtime logs before changing implementation.

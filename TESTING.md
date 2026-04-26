# Testing

This document describes current test execution in this repository, the tools in use, and the critical flows that should remain covered.

## Test Surfaces In Repo

- Backend tests: `tests/unit/` and `tests/integration/`
- Web unit/integration-style tests: `ui/src/**/*.test.ts` and `ui/src/**/*.render.test.ts`
- Web end-to-end tests: `ui/e2e/*.spec.ts`
- Mobile tests: `ui-mobile/__tests__/`
- CI workflow: `.github/workflows/ci.yml`

## How To Run Tests

### Root commands (documented in `Makefile`)

```bash
make test
make test-backend
make test-web
make test-mobile
```

Current behavior:
- `make test` runs backend + web unit tests + mobile tests.
- `make test-web` runs `npm run test` in `ui/` (Vitest), not Playwright e2e.

### Backend tests

From `Makefile`:

```bash
make test-backend
```

Equivalent command in project files:

```bash
pytest tests/ -v
```

CI backend command (`.github/workflows/ci.yml`):

```bash
pytest tests/ -v --cov=app --cov-report=term-missing --cov-fail-under=70
```

### Web tests

From `ui/package.json`:

```bash
npm run test
npm run test:e2e
```

If using root wrapper:

```bash
make test-web
```

Playwright local setup notes are documented in `ui/playwright.config.ts` comments:

```bash
uvicorn app.main:app --reload
npm run dev
npm run test:e2e
```

### Mobile tests

From `ui-mobile/package.json`:

```bash
npm run test
```

If using root wrapper:

```bash
make test-mobile
```

## Test Tools Used

### Backend

- `pytest` and `pytest-cov` (`requirements-dev.txt`)
- FastAPI `TestClient` (`tests/conftest.py`)
- SQLAlchemy transaction-backed test sessions with in-memory SQLite (`tests/conftest.py`)
- `unittest.mock` patching for LLM/external integrations in integration tests

### Web

- `vitest` (`ui/package.json`, configured in `ui/vite.config.ts`)
- `@playwright/test` for e2e (`ui/package.json`, `ui/playwright.config.ts`)
- React Testing Library in unit/render test files (verify in code for per-file usage details)

### Mobile

- `jest` with `jest-expo` preset (`ui-mobile/package.json`)
- `@testing-library/react-native` (used in `ui-mobile/__tests__/workspace/RegenerateSheet.test.tsx`)

### CI

- GitHub Actions runs backend tests, web lint/test/build, and mobile tests (`.github/workflows/ci.yml`)
- Backend CI enforces `--cov-fail-under=70`

## Critical Flows That Must Be Covered

The baseline below maps to existing tests in this repo. If you change these areas, at minimum keep these suites passing or update them with equivalent coverage.

### Backend critical flows

- Auth lifecycle:
  - register, login, `/me`, refresh, password reset, email verification, token reuse rejection
  - `tests/integration/test_auth_api.py`
- Trip lifecycle and access:
  - auth required, create/read/update/delete, ownership boundaries, destination normalization
  - `tests/integration/test_trips.py`
- Collaboration and membership:
  - member add/read, personal vs shared state, invite acceptance, snapshot behavior
  - `tests/integration/test_trip_collaboration.py`
- AI itinerary generation/apply:
  - `/v1/ai/plan` success and not-found handling, LLM fallback behavior
  - `/v1/ai/apply` relational persistence, replace-on-reapply, saved-itinerary reads, ownership checks
  - `tests/integration/test_ai_plan.py`, `tests/integration/test_itinerary_apply.py`
- Rate limiting and cache-sensitive AI paths:
  - limit enforcement on AI endpoints and rule-based cache behavior
  - `tests/integration/test_rate_limit.py`
- On-trip execution correctness:
  - status merge into snapshot, next-stop progression, unplanned stop lifecycle, permissions, idempotency/replay
  - `tests/integration/test_trip_execution.py`
- Logistics:
  - reservations CRUD and ownership, prep item CRUD and ownership, packing suggestion behavior
  - `tests/integration/test_reservations.py`
  - `tests/integration/test_prep.py`
  - `tests/integration/test_packing_suggestions.py`
- Matching:
  - profile prerequisites, duplicate request prevention, overlap/non-overlap matching, interaction persistence
  - `tests/integration/test_matching.py`
- Backend unit invariants:
  - config validation, auth helpers, trip access role checks, timezone/day resolution, vector-store edge cases, compatibility scoring
  - `tests/unit/*.py`

### Web critical flows

- Authentication e2e:
  - register/verify/login/logout/relogin, invalid-credential behavior
  - `ui/e2e/auth.spec.ts`
- Core product loop e2e:
  - register -> create trip -> generate itinerary -> apply -> persistence after reload
  - budget/packing/bookings/chat workspace flows
  - `ui/e2e/core-loop.spec.ts`
- Trip workspace e2e behavior:
  - trip creation/list behavior, members UI, readiness UI, map tab, activity drawer, quick actions
  - `ui/e2e/trips.spec.ts`
- Archive and Explore e2e:
  - archive search/rating/list mode
  - explore route behavior when feature-gated
  - `ui/e2e/archive.spec.ts`, `ui/e2e/explore.spec.ts`
- V1 scope regression guards:
  - removed/renamed surfaces (for example Explore nav visibility, Packing tab label)
  - `ui/e2e/v1-scope.spec.ts`
- Web model/helper unit tests:
  - itinerary mutation/editor/readiness models, on-trip derivation/mutation behavior, activity modeling, map links, retry behavior
  - `ui/src/**/*.test.ts`, `ui/src/**/*.render.test.ts`

### Mobile critical flows (currently present in repo tests)

- Day regeneration sheet behavior:
  - refine mutation payload contract
  - loading/error/preview states
  - accept vs dismiss invariants
  - title fallback behavior
  - `ui-mobile/__tests__/workspace/RegenerateSheet.test.tsx`

Current behavior should be confirmed for broader mobile flow coverage because only one mobile test file is currently present.

## Notes And Gaps

- Root `make test` does not include Playwright e2e; run `npm run test:e2e` in `ui/` when validating full web user journeys.
- CI runs web unit tests (`npm run test`) but does not run Playwright e2e in `.github/workflows/ci.yml`. Current behavior should be confirmed before treating e2e as a merge gate.

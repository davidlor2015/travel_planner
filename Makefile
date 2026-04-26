# Waypoint — developer task runner
# Run from the travel-planner/ directory.
#
# Venv: uses .venv/ (Linux/WSL). Windows PowerShell users use .venv-win/.
# Activate manually before running backend targets if needed, or let the
# targets below handle it via the PYTHON variable.

PYTHON := .venv/bin/python
PIP    := .venv/bin/pip
PYTEST := .venv/bin/pytest
UVICORN := .venv/bin/uvicorn
ALEMBIC := .venv/bin/alembic

.PHONY: help setup migrate seed gen-types \
        dev-backend dev-web dev-mobile \
        test test-backend test-web test-mobile \
        lint lint-backend lint-web lint-mobile \
        docker-up docker-down docker-build

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  Waypoint dev commands"
	@echo ""
	@echo "  Setup"
	@echo "    make setup          Create venv, install deps, run migrations"
	@echo "    make migrate        Run pending Alembic migrations"
	@echo "    make seed           Seed the local DB with realistic sample data"
	@echo "    make gen-types      Generate TypeScript types from FastAPI OpenAPI schema"
	@echo ""
	@echo "  Dev servers (each blocks; open a terminal per process)"
	@echo "    make dev-backend    FastAPI on localhost:8000"
	@echo "    make dev-web        Vite on localhost:5173"
	@echo "    make dev-mobile     Expo dev server (scan QR with Expo Go)"
	@echo ""
	@echo "  Tests"
	@echo "    make test           Run all test suites"
	@echo "    make test-backend   pytest (unit + integration)"
	@echo "    make test-web       Vitest"
	@echo "    make test-mobile    Jest"
	@echo ""
	@echo "  Lint"
	@echo "    make lint           Lint all layers"
	@echo "    make lint-backend   Ruff check + format check"
	@echo "    make lint-web       ESLint"
	@echo "    make lint-mobile    Expo lint"
	@echo ""
	@echo "  Docker"
	@echo "    make docker-up      Start full stack (db + backend + frontend)"
	@echo "    make docker-down    Stop and remove containers"
	@echo "    make docker-build   Rebuild images without cache"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

setup:
	python3 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt -r requirements-dev.txt
	@echo ""
	@echo "  Venv ready. To activate: source .venv/bin/activate"
	@echo "  Next: copy .env.example to .env and fill in JWT_SECRET, then run: make migrate"

migrate:
	$(ALEMBIC) upgrade head

seed:
	$(PYTHON) scripts/seed_db.py

gen-types:
	cd ui && npm run gen:types

# ── Dev servers ───────────────────────────────────────────────────────────────

dev-backend:
	$(UVICORN) app.main:app --reload

dev-web:
	cd ui && npm run dev

dev-mobile:
	cd ui-mobile && npx expo start

# ── Tests ─────────────────────────────────────────────────────────────────────

test: test-backend test-web test-mobile

test-backend:
	$(PYTEST) tests/ -v

test-web:
	cd ui && npm run test

test-mobile:
	cd ui-mobile && npm test

# ── Lint ──────────────────────────────────────────────────────────────────────

lint: lint-backend lint-web lint-mobile

lint-backend:
	.venv/bin/ruff check app/ tests/
	.venv/bin/ruff format --check app/ tests/

lint-web:
	cd ui && npm run lint

lint-mobile:
	cd ui-mobile && npx expo lint

# ── Docker ────────────────────────────────────────────────────────────────────

docker-up:
	docker compose up

docker-down:
	docker compose down

docker-build:
	docker compose build --no-cache

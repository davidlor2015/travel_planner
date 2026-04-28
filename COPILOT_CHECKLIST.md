# Copilot Checklist — Waypoint

## 1. Before Making Changes

- [ ] Read `V1_SCOPE.md`.
- [ ] Read `AGENTS.md` if it exists.
- [ ] Read `README.md` if the task affects setup, commands, or documentation.
- [ ] Identify the exact files needed before editing.
- [ ] Confirm whether the task affects:
  - [ ] `app/` backend
  - [ ] `ui/` web app
  - [ ] `ui-mobile/` mobile app
  - [ ] `alembic/` migrations
  - [ ] `tests/`
  - [ ] `docs/`
- [ ] Do not start broad refactors unless explicitly requested.
- [ ] Do not introduce static/mock production data.
- [ ] Do not build features outside `V1_SCOPE.md`.

---

## 2. Scope Rules

- [ ] Keep the change small and targeted.
- [ ] Preserve existing behavior unless the task explicitly asks to change it.
- [ ] Prefer extending existing systems over creating parallel systems.
- [ ] Do not expose unfinished features in primary navigation.
- [ ] Hide or feature-flag incomplete surfaces instead of deleting them.
- [ ] Companion/matching should remain preserved but hidden from primary navigation for V1 unless explicitly requested.
- [ ] If the request conflicts with `V1_SCOPE.md`, stop and report the conflict.

---

## 3. Architecture Rules

### Backend: `app/`

- [ ] Keep route, service, repository, schema, and model responsibilities separated.
- [ ] Do not put database logic directly in route handlers.
- [ ] Use Pydantic schemas for request/response validation.
- [ ] Use repository methods for database access.
- [ ] Add or update integration tests when backend behavior changes.
- [ ] Do not create new endpoints unless necessary for the requested behavior.

### Web: `ui/`

- [ ] Keep render components thin.
- [ ] Put orchestration/state coordination in hooks or models.
- [ ] Put reusable business logic in pure helpers.
- [ ] Use existing shared API clients.
- [ ] Preserve Waypoint's warm editorial design direction.
- [ ] Do not introduce generic dashboard-style UI.

### Mobile: `ui-mobile/`

- [ ] Reuse existing mobile patterns and components.
- [ ] Check related `ui/` web patterns when mobile behavior should match web.
- [ ] Preserve Expo Router structure.
- [ ] Do not create duplicate screens if an existing route can be reused.
- [ ] Keep Today/OnTrip focused on execution: next stop, timeline, navigate, confirm/skip, log stop.
- [ ] Use real data from existing hooks/API clients.
- [ ] Do not use fake trips, fake stops, or fake users in production UI.

---

## 4. UI/UX Rules

- [ ] Keep Waypoint calm, warm, editorial, and mobile-first.
- [ ] Prioritize clarity over feature density.
- [ ] Use proper loading, empty, and error states.
- [ ] Do not leave broken buttons or placeholder primary actions.
- [ ] Avoid duplicate status UI.
- [ ] Do not truncate important labels like time, destination, or status unless unavoidable.
- [ ] In OnTrip/Today mode, prefer concrete times over vague labels when available.
- [ ] Confirm/Skip/Navigate actions must remain easy to tap.
- [ ] Archive should be positioned as Memories when user-facing, but route/file names do not need risky renaming unless requested.
- [ ] **Do not change colors, fonts, or typography in `ui/` or `ui-mobile/` unless explicitly requested.**

---

## 5. Trip Execution Rules

- [ ] Saved itinerary represents the plan.
- [ ] Execution events represent what actually happened.
- [ ] Do not mutate the saved itinerary just because the user confirms/skips a stop.
- [ ] Confirmed/skipped stops should not remain as the current "Next Stop."
- [ ] Unplanned stops should be logged separately from planned itinerary stops.
- [ ] Today/OnTrip should support:
  - [ ] Today timeline
  - [ ] Next stop
  - [ ] Navigate
  - [ ] Confirm stop
  - [ ] Skip stop
  - [ ] Log unplanned stop
- [ ] If no active trip exists, Today should show a useful idle/prep state instead of feeling broken.

---

## 6. Navigation Rules

- [ ] Primary mobile navigation should support the V1 loop:
  - [ ] Trips
  - [ ] Explore
  - [ ] Today
  - [ ] Memories/Archive
  - [ ] Profile
- [ ] Hide Companion from primary navigation for V1.
- [ ] Do not delete Companion/matching files.
- [ ] Do not remove matching routes, APIs, hooks, or types unless explicitly requested.
- [ ] Preserve deep links where possible.
- [ ] Avoid risky route renames unless necessary.

---

## 7. Documentation Rules

- [ ] Update docs when changing architecture, setup, commands, deployment, API behavior, or testing behavior.
- [ ] Do not invent implementation details.
- [ ] If uncertain, write "verify in code" or leave a clear note.
- [ ] Keep documentation practical and repo-specific.
- [ ] Prefer one documentation file per task.
- [ ] Important docs:
  - [ ] `README.md`
  - [ ] `V1_SCOPE.md`
  - [ ] `ARCHITECTURE.md`
  - [ ] `DEPLOYMENT.md`
  - [ ] `TESTING.md`
  - [ ] `AGENTS.md`
  - [ ] `docs/TRIP_EXECUTION.md`
  - [ ] `docs/API.md`
  - [ ] `docs/DATABASE.md`
  - [ ] `docs/DESIGN_SYSTEM.md`

---

## 8. Testing / Validation

Run the safest relevant checks for the files touched.

### Backend changes

- [ ] Run backend tests if available:
  ```bash
  pytest tests/ -v
  ```

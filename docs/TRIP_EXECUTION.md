# Trip Execution

How active-trip execution works today across backend, web, and mobile.

## Scope and source of truth

- Backend snapshot + resolution logic: `app/services/trip_service.py`
- Backend write paths: `app/services/trip_execution_service.py`
- Execution persistence/idempotency: `app/repositories/trip_execution_repository.py`
- Execution API routes: `app/api/v1/routes/trip_execution.py`, `app/api/v1/routes/trips.py`
- Schema contracts: `app/schemas/trip.py`
- Web OnTrip UI + mutations: `ui/src/features/trips/workspace/OnTripCompactMode.tsx`, `ui/src/features/trips/workspace/onTrip/*`, `ui/src/shared/api/trips.ts`
- Mobile OnTrip UI + mutations: `ui-mobile/features/trips/onTrip/*`, `ui-mobile/features/trips/api.ts`, `ui-mobile/app/(tabs)/trips/[tripId]/live.tsx`
- Backend integration coverage: `tests/integration/test_trip_execution.py`, `tests/integration/test_trip_collaboration.py`

## What Active Trip Execution means

Active-trip execution is the runtime layer used while traveling:

- The saved itinerary stays as the plan of record.
- Real-time actions (confirm/skip/log unplanned) are written as execution events.
- Snapshot endpoints overlay execution events on top of saved itinerary items at read time.

The backend marks a trip as active when:

- `trip.start_date <= today <= trip.end_date`
- source: `TripService.get_on_trip_snapshot` in `app/services/trip_service.py`

## How OnTrip mode works

## Backend mode and permissions

`GET /v1/trips/{trip_id}/on-trip-snapshot` returns:

- `mode`: `active` or `inactive`
- `read_only`: derived from `TripAccessService.can_execute_on_trip(...)`
- `today`, `next_stop`, `today_stops`, `today_unplanned`, `blockers`

Current write permission logic:

- accepted `owner` and `member` roles can execute on-trip writes
- source: `app/services/trip_access_service.py`

## Frontend entry behavior

- Web: compact OnTrip rendering is driven from trip/workspace state and snapshot responses in `ui/src/features/trips/list/useTripWorkspaceModel.ts` + `ui/src/features/trips/workspace/OnTripCompactMode.tsx`.
- Mobile: `canOpenOnTrip(...)` currently requires both `status === "active"` and at least one resolved today stop (`ui-mobile/features/trips/onTrip/eligibility.ts`).

If behavior around when OnTrip surfaces differs between web and mobile, current behavior should be confirmed in code.

## How the app chooses Today and Next up

## Today date selection

- Client sends optional timezone query `tz` from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - web: `ui/src/shared/api/trips.ts`
  - mobile: `ui-mobile/features/trips/api.ts`
- Server resolves traveler date via `_resolve_today(tz)`.
- Invalid/missing timezone falls back to server-local `date.today()` (no endpoint failure).

## Today day selection

Server `_pick_today_day(...)` uses this order:

1. Exact `day.date == today` match (`source=day_date_exact`, `confidence=high`)
2. If in trip date window, fallback by day offset from `trip.start_date` (`source=trip_day_offset`, `confidence=medium`)
3. Otherwise unresolved (`source=none`, `confidence=low`)
4. Duplicate exact matches return ambiguous (`source=ambiguous`, `confidence=low`)

## Today stop selection

Server `_pick_today_stop(...)`:

- considers items with plan status in `{planned, confirmed}`
- sorts by parseable time (unparseable times sort later)
- picks first stop with time `>= now` in traveler timezone
- falls back to earliest actionable stop if all candidate times are earlier

## Next up selection

Server `_pick_next_stop(...)` scans itinerary order from today forward and excludes:

- plan-level `status == skipped`
- execution-level `execution_status in {confirmed, skipped}`

First remaining eligible stop becomes `next_stop`.

## Client-side “Now”

Server does not return a dedicated “now” field. Web and mobile derive it client-side:

- choose latest stop with time `<= now`
- exclude terminal status (`confirmed` or `skipped`)

Sources:

- web: `ui/src/features/trips/workspace/onTrip/deriveCurrentStop.ts`
- mobile: `ui-mobile/features/trips/onTrip/adapters.ts`

This means “Now” and server `next_stop` can differ; that is current behavior.

## Confirmed / Skipped / Planned status behavior

## Data model

- Plan status lives on itinerary items (`status`)
- Execution status is overlaid from latest execution event per `stop_ref`
- Effective UI status is generally `execution_status ?? status ?? "planned"`

## Writes

`POST /v1/trips/{trip_id}/execution/stop-status`

- validates membership
- validates `stop_ref` belongs to current saved itinerary for that trip
- writes execution event kind `stop_status`

Idempotency detail:

- if latest stop_status event for a stop already has the requested status, repository returns that existing row instead of inserting a duplicate
- source: `TripExecutionRepository.record_stop_status`

## UI toggles

Web and mobile both toggle terminal statuses back to planned when user taps the active terminal state again.

Current behavior should be confirmed in code before changing status-toggle UX.

## How unplanned stops are logged

`POST /v1/trips/{trip_id}/execution/unplanned-stop`

- required: `day_date`, `title`
- optional: `time`, `location`, `notes`, `client_request_id`
- blank titles are rejected by schema validation

Idempotency detail:

- when `client_request_id` is provided, retries with the same id return the same row
- without it (or whitespace-only id normalized to null), writes remain append-only

Read behavior:

- snapshot includes `today_unplanned` for active mode using current resolved date
- repository sorts unplanned events by `(time is null, time, created_at)`

Delete behavior:

`DELETE /v1/trips/{trip_id}/execution/events/{event_id}`

- allowed for event creator or trip owner
- otherwise `403`
- second delete after success returns `404`

## How execution log differs from saved itinerary

Execution events do not mutate itinerary rows.

- Saved itinerary: `itinerary_days` + `itinerary_events`
- Execution log: `trip_execution_events` (append-only)
- Snapshot read path merges both at response time

Important consequence:

- `stop_ref` maps to itinerary event IDs (`str(item.id)`)
- if itinerary is re-applied/rebuilt and IDs change, old `stop_ref` values are rejected (`Stop not found in saved itinerary`)

## Backend endpoints involved

- `GET /v1/trips/{trip_id}/on-trip-snapshot`
- `POST /v1/trips/{trip_id}/execution/stop-status`
- `POST /v1/trips/{trip_id}/execution/unplanned-stop`
- `DELETE /v1/trips/{trip_id}/execution/events/{event_id}`

All three mutation routes are rate-limited by `EXECUTION_RATE_LIMIT`.

## Frontend files involved

## Web

- API adapters: `ui/src/shared/api/trips.ts`
- Main surface: `ui/src/features/trips/workspace/OnTripCompactMode.tsx`
- Mutation orchestration: `ui/src/features/trips/workspace/onTrip/hooks/useOnTripMutations.ts`
- “Now” derivation: `ui/src/features/trips/workspace/onTrip/deriveCurrentStop.ts`
- OnTrip UI parts: `ui/src/features/trips/workspace/onTrip/*.tsx`

## Mobile

- API adapters: `ui-mobile/features/trips/api.ts`
- Main surface: `ui-mobile/features/trips/onTrip/OnTripScreen.tsx`
- Mutation orchestration: `ui-mobile/features/trips/onTrip/hooks.ts`
- View-model/status derivation: `ui-mobile/features/trips/onTrip/adapters.ts`
- Navigation entry route: `ui-mobile/app/(tabs)/trips/[tripId]/live.tsx`

## Tests that should protect this behavior

## Backend integration tests (existing)

`tests/integration/test_trip_execution.py` currently covers:

- stop status overlay into snapshot
- latest-event-wins behavior
- next-stop advancement and blocker reopening/clearing
- plan-skipped + execution-terminal exclusion rules
- unplanned add/list/delete behavior
- permission and membership checks
- stop_ref validation
- idempotency contracts for stop status and unplanned stops
- delete-twice second-call `404` behavior

`tests/integration/test_trip_collaboration.py` currently covers:

- `read_only` permission expectations for accepted members
- blocker bucket behavior (`on_trip_execution`)

## Frontend tests (existing)

Web tests include:

- `ui/src/features/trips/workspace/onTrip/deriveCurrentStop.test.ts`
- `ui/src/features/trips/workspace/onTrip/hooks/useOnTripMutations.test.ts`
- render tests for OnTrip subcomponents in same folder

Mobile OnTrip test coverage should be confirmed in code.

## Planned

- Add mobile-specific tests for optimistic status reconciliation and unplanned-stop idempotency paths (current behavior should be confirmed).

## Intentionally out of scope

- Rewriting saved itinerary during execution actions
- Multi-day “full replan” logic inside OnTrip execution endpoints
- Non-member execution permissions (viewer/observer roles are not currently implemented)
- Analytics/notifications architecture beyond existing UI event tracking

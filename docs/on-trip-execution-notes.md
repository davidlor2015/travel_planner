# On-Trip execution: current behavior + edge cases

This document captures **current** behavior before refactoring the On-Trip UI into an execution-first experience. It is meant to prevent regressions by locking in the existing server/client semantics.

## Current sources of truth

- **Server snapshot**: `TripService.get_on_trip_snapshot` builds `today`, `next_stop`, `today_stops`, `today_unplanned`, `blockers` and overlays `execution_status` from the latest execution-log event per `stop_ref`.
  - File: `app/services/trip_service.py`
- **Client “Now”**: the UI computes a “Now” card client-side via `deriveCurrentStop(today_stops)` based on local wall-clock time and excludes terminal statuses.
  - File: `ui/src/features/trips/workspace/OnTripCompactMode.tsx`
- **Optimistic execution state**: `useOnTripMutations` merges local overrides into `viewSnapshot` and polls/refreshes the server snapshot to converge across devices.
  - File: `ui/src/features/trips/workspace/useOnTripMutations.ts`

## Timezone + “today” resolution (server)

- The client passes `tz` as an IANA timezone string when fetching the snapshot.
  - File: `ui/src/shared/api/trips.ts` (`getTripOnTripSnapshot` uses `Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Server resolves today via `_resolve_today(tz)` and **silently falls back** to `date.today()` if `tz` is missing/invalid.
  - File: `app/services/trip_service.py`
- Server uses `today` to decide:
  - `mode` = `"active"` only when `trip.start_date <= today <= trip.end_date`
  - unplanned events included only when active (`unplanned_stops_for_date(trip_id, today)`)

## “Now” selection mismatch risk (server vs client)

- Server `_pick_today_stop(...)` selects the first actionable item whose time is **>= now** (traveler timezone), falling back to the earliest item if none qualifies.
  - “Actionable” = plan status in `{planned, confirmed}` (plan-level `skipped` excluded).
  - File: `app/services/trip_service.py`
- Client `deriveCurrentStop(today_stops)` selects the latest stop whose time is **<= now** and whose effective status is not terminal.
  - “Terminal” = execution_status or plan status is `confirmed` or `skipped`.
  - File: `ui/src/features/trips/workspace/OnTripCompactMode.tsx`
- Implication: the UI can show **Now** and **Next up** that are not the same stop, and that’s currently acceptable. Refactors must preserve the intent:
  - **Now** is conservative and can be `null`.
  - **Next up** is always server-driven, with a client-side optimistic override in `useOnTripMutations`.

## Status semantics

- Effective status in UI is `execution_status ?? status ?? "planned"`.
  - File: `OnTripCompactMode.tsx` (`effectiveStatus`)
- Server `_pick_next_stop` eligibility rule:
  - Exclude plan-level `skipped`
  - Exclude execution-level `confirmed` / `skipped`
  - File: `app/services/trip_service.py`
- Tests lock this overlay behavior:
  - “next stop advances after confirmed”
  - “today-planned-open blocker disappears when all stops terminal”
  - “reverting to planned reopens blocker and next stop”
  - File: `tests/integration/test_trip_execution.py`

## `stop_ref` rules

- `stop_ref` is derived from itinerary item `id` (`str(item.id)`), otherwise `None`.
  - File: `app/services/trip_service.py` (`_item_stop_ref`)
- UI disables status changes when `stop_ref` is missing.
  - File: `OnTripCompactMode.tsx` (`StopRowView` disables if `!stop.stop_ref || isPending`)

## `read_only` behavior

- Snapshot schema includes `read_only: bool` (schema default `True` is a safe
  fallback for any caller that omits the flag; the service always sets it).
  - File: `app/schemas/trip.py`
- `TripService.get_on_trip_snapshot` derives `read_only` from the access
  context: `read_only = not access_service.can_execute_on_trip(context)`.
  Any accepted membership (owner or member) is writable; future viewer /
  archived / locked states extend `TripAccessService.can_execute_on_trip`.
  - Files: `app/services/trip_service.py`, `app/services/trip_access_service.py`
- UI honors `read_only` by **hiding** execution affordances, not disabling
  them: Confirm / Skip / Reset in `HappeningNowCard` and the `next` row of
  `TimelineRow`, the `LogStopFAB`, and the Log-a-stop CTA + per-row Remove
  in `UnplannedList` are all omitted. Navigate (Go) and the informational
  Read-only badge in the header remain.
  - Files: `OnTripCompactMode.tsx`, `onTripParts/HappeningNowCard.tsx`,
    `onTripParts/TimelineRow.tsx`, `onTripParts/UnplannedList.tsx`,
    `onTripParts/OnTripHeader.tsx`
- `buildStopActions` in `OnTripCompactMode` still returns no-op handlers when
  `readOnly` — kept as defense-in-depth behind the render-side gating.

## Optimistic update behavior + race risks

- `useOnTripMutations.refreshSnapshot()` clears **all** optimistic overrides on **any successful** server read:
  - status overrides
  - optimistic deletions for unplanned
  - File: `useOnTripMutations.ts`
- Polling + foreground refresh:
  - 60s poll while `tripId` is selected.
  - `visibilitychange` + `window.focus` refresh with 2s coalescing debounce (`lastRefreshAtRef`).
  - File: `useOnTripMutations.ts`
- Risk: poll/foreground refresh can land while a mutation is in-flight, wiping overrides before the mutation POST resolves (UI may “flash back” briefly). Phase 4 addresses this with requestId-guarded optimistic entries.

## Maps deep-links today

- All Navigate links are derived from a query string search:
  - Apple mobile: `maps://?q=<encoded>`
  - Others: `https://www.google.com/maps/search/?api=1&query=<encoded>`
  - File: `OnTripCompactMode.tsx` (`mapsHrefForStop`)
- Planned itinerary items already store `lat`/`lon` in DB (`ItineraryEvent.lat/lon`), but those coordinates are not currently included in the snapshot response.
  - File: `app/models/itinerary.py`

## Unplanned stops

- Unplanned stop add is *not* optimistic (server assigns `event_id`).
  - File: `useOnTripMutations.ts` (`logUnplannedStop`)
- Unplanned stop delete is optimistic (hidden locally until refresh; rollback on failure).
  - File: `useOnTripMutations.ts` (`deletedUnplannedIds`)


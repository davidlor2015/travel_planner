// Path: ui/src/features/trips/workspace/onTrip/deriveCurrentStop.ts
// Summary: Implements deriveCurrentStop module logic.

import type { TripOnTripStopSnapshot } from "../../../../shared/api/trips";

/**
 * Parse a stored time string ("HH:MM" or "HH:MM am/pm") into total minutes
 * from midnight. Returns null when unparseable. Intentionally permissive so
 * plan data that slipped through older validators still renders and only the
 * unparseable row drops out of the "Now" calculation.
 */
export function parseTimeToMinutes(
  time: string | null | undefined,
): number | null {
  const raw = time?.trim() ?? "";
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1]!, 10);
  const minute = parseInt(m[2]!, 10);
  const suffix = m[3]?.toLowerCase();
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/**
 * Derive the "current" stop client-side. The server returns `today_stops` +
 * `next_stop` but no explicit "now". Pick the stop whose time has already
 * started and has not been confirmed or skipped — i.e. the thing the user is
 * most likely doing right now. Returns null when there is no viable match.
 *
 * Intentionally conservative: if nothing has started yet, or everything is
 * done/skipped, we show no "Now" card and defer to the server's next_stop.
 *
 * `nowMinutes` is injected (not read from `new Date()` inside) so tests can
 * lock exact boundary behaviour without mocking the global clock.
 */
export function deriveCurrentStop(
  stops: TripOnTripStopSnapshot[],
  nowMinutes: number,
): TripOnTripStopSnapshot | null {
  let best: { stop: TripOnTripStopSnapshot; startedAt: number } | null = null;
  for (const stop of stops) {
    const status = stop.execution_status ?? stop.status ?? "planned";
    if (status === "confirmed" || status === "skipped") continue;
    const startedAt = parseTimeToMinutes(stop.time);
    if (startedAt == null) continue;
    if (startedAt > nowMinutes) continue;
    if (!best || startedAt > best.startedAt) {
      best = { stop, startedAt };
    }
  }
  return best?.stop ?? null;
}

/**
 * Compute the device-local wall-clock minute-of-day. Extracted so `new Date()`
 * is contained to a single call site and the rest of the "Now" pipeline is
 * pure and trivially testable.
 */
export function currentLocalMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Return today's date in the device's local timezone as an ISO `YYYY-MM-DD`
 * string. Used as a fallback for forms when the server snapshot cannot
 * supply a `day_date` (e.g. the "Log a stop" sheet defaulting on an inactive
 * trip). Keep in lockstep with server-side `_resolve_today` fallbacks so both
 * halves agree on what "today" means for that client.
 */
export function todayLocalISODate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

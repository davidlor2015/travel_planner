// Path: ui-mobile/features/trips/onTrip/presentation.ts
// Summary: Implements presentation module logic.

import type {
  TripExecutionStatus,
  TripOnTripBlocker,
  TripOnTripSnapshot,
} from "../types";
import type { StopVM, TimelineVariant } from "./adapters";

export { splitStopTimeDisplay } from "../stopTime";
export type { StopTimeDisplay } from "../stopTime";

// ─── Day header ───────────────────────────────────────────────────────────────

export type OnTripDayHeaderVM = {
  eyebrow: string;
  /** @deprecated Prefer single-line `eyebrow` — kept optional for callers; usually null */
  dateLabel: string | null;
  title: string;
  meta: string;
};

/**
 * Builds the editorial day header for the Today execution surface.
 *
 * `eyebrow` is like `TODAY · MAY 1 · DAY 3`: month abbreviation, calendar day number, plus itinerary DAY N — using snapshot
 * `today.day_date` when present, otherwise `tripStartDate + (day_number - 1)` when both exist, otherwise the device's calendar date.
 *
 * Title priority:
 *   1. "{Weekday} in {shortDestination}"  — uses trip.destination, never stop locations
 *   2. "Today in {shortDestination}"       — when day_date is unavailable
 *   3. "Today's plan"                      — final fallback
 *
 * Stop location / address strings are intentionally excluded from the title.
 */
export function buildOnTripDayHeader(
  snapshot: TripOnTripSnapshot,
  tripTitle: string,
  tripDestination?: string,
  tripStartDate?: string | null,
): OnTripDayHeaderVM {
  const resolvedIso = resolveExecutionDayCalendarIso(snapshot, tripStartDate);
  const eyebrow = formatTodayExecutionEyebrow(resolvedIso, snapshot.today.day_number);
  const dateLabel: string | null = null;

  const weekday = formatWeekday(resolvedIso);
  const destination = tripDestination?.trim() || tripTitle.trim() || "";
  const shortPlace = extractShortDestination(destination);

  let title: string;
  if (weekday && shortPlace) {
    title = `${weekday} in ${shortPlace}`;
  } else if (shortPlace) {
    title = `Today in ${shortPlace}`;
  } else {
    title = "Today's plan";
  }

  const meta = [
    formatShortDate(resolvedIso),
    formatStopCount(snapshot.today_stops.length),
  ]
    .filter(Boolean)
    .join(" · ");

  return { eyebrow, dateLabel, title, meta };
}

/** Takes only the city/region part from "Rome, Italy" → "Rome". */
function extractShortDestination(destination: string): string {
  const parts = destination
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] ?? destination;
}

// ─── Blocker strip ────────────────────────────────────────────────────────────

export type OnTripBlockerStripVM = {
  title: string;
  detail: string | null;
  actionLabel: string | null;
};

export function buildBlockerStrip(
  blockers: TripOnTripBlocker[],
): OnTripBlockerStripVM | null {
  const first = blockers[0];
  if (!first) return null;

  if (first.id === "today-planned-open") {
    // Title is pre-computed by deriveOnTripViewModel from effective execution status.
    return {
      title: first.title,
      detail: "Confirm or skip the remaining stops for today.",
      actionLabel: null,
    };
  }

  const hasDetail = Boolean(first.detail?.trim());
  return {
    title: first.title,
    detail: first.detail?.trim() || null,
    actionLabel:
      blockers.length > 1
        ? `${blockers.length} items`
        : hasDetail
          ? "Adjust"
          : null,
  };
}

// ─── Navigate URL ─────────────────────────────────────────────────────────────

export function buildNavigateUrl(stop: StopVM): string | null {
  const location = stop.location?.trim();
  if (!location) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(location)}`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export type OnTripStatusTone = "confirmed" | "planned" | "skipped";

export function getStatusLabel(status: TripExecutionStatus): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "skipped") return "Skipped";
  return "Planned";
}

export function getStatusTone(status: TripExecutionStatus): OnTripStatusTone {
  if (status === "confirmed") return "confirmed";
  if (status === "skipped") return "skipped";
  return "planned";
}

export function isStopNow(variant: TimelineVariant): boolean {
  return variant === "now";
}

export function shouldMuteStop(stop: StopVM): boolean {
  return stop.effectiveStatus === "skipped";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Parses an ISO calendar day at local noon so the printed day stays stable across timezones. */
function calendarDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function isoDatePrefix(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const head = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
}

function formatLocalCalendarIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addLocalCalendarDays(base: Date, offset: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + offset);
  return d;
}

/**
 * Canonical YYYY-MM-DD for execution "today".
 * Priority: snapshot `today.day_date` -> trip `start_date` + (`day_number` - 1) -> device calendar day.
 */
function resolveExecutionDayCalendarIso(
  snapshot: TripOnTripSnapshot,
  tripStartDate?: string | null,
): string {
  const fromSnapshot = isoDatePrefix(snapshot.today.day_date);
  if (fromSnapshot) {
    const d = calendarDate(fromSnapshot);
    if (!Number.isNaN(d.getTime())) return fromSnapshot;
  }

  const dayNum = snapshot.today.day_number;
  const start = isoDatePrefix(tripStartDate ?? null);
  if (start != null && typeof dayNum === "number" && dayNum > 0) {
    const base = calendarDate(start);
    if (!Number.isNaN(base.getTime())) {
      return formatLocalCalendarIso(addLocalCalendarDays(base, dayNum - 1));
    }
  }

  return formatLocalCalendarIso(new Date());
}

/** One-line uppercase kicker, e.g. `TODAY · MAY 1 · DAY 3`. */
function formatTodayExecutionEyebrow(
  resolvedIso: string,
  dayNumber: number | null | undefined,
): string {
  const date = calendarDate(resolvedIso);
  if (Number.isNaN(date.getTime())) {
    return typeof dayNumber === "number" && dayNumber > 0
      ? `TODAY · DAY ${dayNumber}`
      : "TODAY";
  }
  const mon = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const dom = date.getDate();
  const cal = `${mon} ${dom}`;
  if (typeof dayNumber === "number" && dayNumber > 0) {
    return `TODAY · ${cal} · DAY ${dayNumber}`;
  }
  return `TODAY · ${cal}`;
}

function formatWeekday(iso: string | null): string | null {
  if (!iso) return null;
  const date = calendarDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = calendarDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStopCount(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

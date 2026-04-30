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
  dateLabel: string | null;
  title: string;
  meta: string;
};

/**
 * Builds the editorial day header for the OnTrip screen.
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
): OnTripDayHeaderVM {
  const dayNumber = snapshot.today.day_number;
  const eyebrow =
    typeof dayNumber === "number" && dayNumber > 0
      ? `ON TRIP · DAY ${dayNumber}`
      : "ON TRIP";
  const dateLabel = formatActiveDayDateLabel(snapshot.today.day_date);

  const weekday = formatWeekday(snapshot.today.day_date);
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
    formatShortDate(snapshot.today.day_date),
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

/**
 * Formats the active trip day date as "WEDNESDAY · APR 29" — the same uppercase
 * style that was previously shown on the Trips list header, now moved here so
 * the label is contextual to the active travel day.
 */
function formatActiveDayDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  return `${weekday} · ${monthDay}`;
}

function formatWeekday(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStopCount(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

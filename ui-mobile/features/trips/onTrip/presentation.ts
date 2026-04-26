import type { TripExecutionStatus, TripOnTripBlocker, TripOnTripSnapshot } from "../types";
import type { StopVM, TimelineVariant } from "./adapters";

// ─── Time display ─────────────────────────────────────────────────────────────

const VAGUE_TIME_LABELS = new Set(["morning", "afternoon", "evening", "night"]);

const PERIOD_SHORT: Record<string, string> = {
  morning: "Morn",
  afternoon: "Aft",
  evening: "Eve",
  night: "Night",
};

export type StopTimeDisplay = {
  period: string | null;
  clock: string | null;
};

/**
 * Splits a stop time value into a short period label and a 24-hour clock string
 * so the narrow time column can render them on two lines without word-wrapping.
 *
 * Handles:
 *   "morning" / "afternoon" / "evening"  → { period: "Morn" | "Aft" | "Eve", clock: null }
 *   "09:00" / "14:00" / "9:00 AM"        → { period: null, clock: "09:00" }
 *   "Afternoon, 14:00" / "morning 09:00" → { period: "Aft", clock: "14:00" }
 *   null / ""                            → { period: null, clock: null }
 */
export function splitStopTimeDisplay(raw: string | null | undefined): StopTimeDisplay {
  const value = raw?.trim() ?? "";
  if (!value) return { period: null, clock: null };

  const lower = value.toLowerCase();

  // Pure period label
  if (VAGUE_TIME_LABELS.has(lower)) {
    return { period: PERIOD_SHORT[lower] ?? null, clock: null };
  }

  // Pure clock (24-h or 12-h)
  if (/^(\d{1,2}):(\d{2})(\s*(am|pm))?$/i.test(value)) {
    return { period: null, clock: normalizeClockTo24h(value) };
  }

  // Combined: "Afternoon, 14:00" / "morning 09:00" / "evening 7:00 PM"
  const combinedMatch = value.match(
    /^(morning|afternoon|evening|night)[,\s]+(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)/i,
  );
  if (combinedMatch) {
    const periodKey = combinedMatch[1]!.toLowerCase();
    return {
      period: PERIOD_SHORT[periodKey] ?? null,
      clock: normalizeClockTo24h(combinedMatch[2]!),
    };
  }

  // Unknown — truncate to prevent overflow
  return { period: null, clock: value.slice(0, 8) };
}

function normalizeClockTo24h(raw: string): string {
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return raw;
  let hour = parseInt(m[1]!, 10);
  const minute = m[2]!;
  const ampm = m[3]?.toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

// ─── Day header ───────────────────────────────────────────────────────────────

export type OnTripDayHeaderVM = {
  eyebrow: string;
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

  const weekday = formatWeekday(snapshot.today.day_date);
  const destination = (tripDestination?.trim() || tripTitle.trim()) || "";
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

  return { eyebrow, title, meta };
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

export function buildBlockerStrip(blockers: TripOnTripBlocker[]): OnTripBlockerStripVM | null {
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
      blockers.length > 1 ? `${blockers.length} items` : hasDetail ? "Adjust" : null,
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

// Path: ui-mobile/features/trips/stopTime.ts
// Summary: Normalizes itinerary and on-trip stop time strings for display.

type FormatOptions = {
  fallback?: string;
};

const DEFAULT_FALLBACK = "No time";

const VAGUE_TIME_LABELS: Record<string, string> = {
  "early morning": "Early morning",
  "late morning": "Late morning",
  morning: "Morning",
  "early afternoon": "Early afternoon",
  "late afternoon": "Late afternoon",
  afternoon: "Afternoon",
  "early evening": "Early evening",
  "late evening": "Late evening",
  evening: "Evening",
  night: "Night",
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseClockParts(
  value: string | null | undefined,
): { hour24: number; minute: number } | null {
  const raw = normalizeWhitespace(value ?? "");
  if (!raw) return null;

  const match = raw.match(
    /(?:^|[T\s])(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?(?=$|[\s.,Z+-])/,
  );
  if (!match) return null;

  let hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  const suffix = match[3]?.toLowerCase();
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return { hour24: hour, minute };
}

function normalizeVagueTimeLabel(value: string): string | null {
  const raw = normalizeWhitespace(value).toLowerCase().replace(/[.,]/g, "");
  return VAGUE_TIME_LABELS[raw] ?? null;
}

function formatClock(hour24: number, minute: number): string {
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatTripStopTime(
  value: string | null | undefined,
  options?: FormatOptions,
): string {
  const fallback = options?.fallback ?? DEFAULT_FALLBACK;
  const raw = normalizeWhitespace(value ?? "");
  if (!raw) return fallback;

  const clock = parseClockParts(raw);
  if (clock) return formatClock(clock.hour24, clock.minute);

  return normalizeVagueTimeLabel(raw) ?? raw;
}

export function stopTimeToMinutes(
  value: string | null | undefined,
): number | null {
  const clock = parseClockParts(value);
  return clock ? clock.hour24 * 60 + clock.minute : null;
}

export type StopTimeDisplay = { clock: string | null; period: string | null };

/** Splits a raw stop time string into a clock token and a vague-period token.
 *  Exactly one will be non-null for a recognised value; both null when empty. */
export function splitStopTimeDisplay(
  value: string | null | undefined,
): StopTimeDisplay {
  const raw = normalizeWhitespace(value ?? "");
  if (!raw) return { clock: null, period: null };

  const parts = parseClockParts(raw);
  if (parts)
    return { clock: formatClock(parts.hour24, parts.minute), period: null };

  return { clock: null, period: normalizeVagueTimeLabel(raw) };
}

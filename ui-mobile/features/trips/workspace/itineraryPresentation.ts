// Path: ui-mobile/features/trips/workspace/itineraryPresentation.ts
// Summary: Implements itineraryPresentation module logic.

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";

export type ItineraryFilterKey = "all" | "activities" | "transit" | "reservations";

export const ITINERARY_FILTERS: { key: ItineraryFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activities", label: "Activities" },
  { key: "transit", label: "Transit" },
  { key: "reservations", label: "Reservations" },
];

export type ItineraryStopPill = {
  label: string;
  tone: "activity" | "reservation" | "transit";
};

export type ItineraryStopTimeBlock = {
  primary: string;
  secondary: string | null;
};

export type ItineraryTabStop = {
  item: ItineraryItem;
  stopIndex: number;
  timeBlock: ItineraryStopTimeBlock;
  title: string;
  location: string | null;
  pill: ItineraryStopPill;
};

export type ItineraryTabDay = {
  day: DayPlan;
  dayIndex: number;
  dayLabel: string;
  dateLabel: string | null;
  stopCountLabel: string;
  stops: ItineraryTabStop[];
};

type StopKind = "activity" | "lodging" | "walk" | "transit" | "reservation";

export function buildItineraryTabDays(
  itinerary: Itinerary | null,
  filter: ItineraryFilterKey,
): ItineraryTabDay[] {
  if (!itinerary) return [];

  return itinerary.days
    .map((day, dayIndex) => {
      const stops = day.items
        .map((item, stopIndex) => ({ item, stopIndex, kind: classifyItineraryItem(item) }))
        .filter(({ kind }) => filterMatchesKind(filter, kind))
        .map(({ item, stopIndex, kind }) => ({
          item,
          stopIndex,
          timeBlock: formatItineraryStopTime(item.time),
          title: item.title?.trim() || "Untitled stop",
          location: item.location?.trim() || null,
          pill: pillForKind(kind),
        }));

      return {
        day,
        dayIndex,
        dayLabel: `Day ${day.day_number}`,
        dateLabel: formatItineraryDayDate(day.date),
        stopCountLabel: `${stops.length} ${stops.length === 1 ? "stop" : "stops"}`,
        stops,
      };
    })
    .filter((day) => filter === "all" || day.stops.length > 0);
}

function filterMatchesKind(filter: ItineraryFilterKey, kind: StopKind): boolean {
  if (filter === "all") return true;
  if (filter === "activities") return kind === "activity" || kind === "walk";
  if (filter === "transit") return kind === "transit";
  return kind === "reservation" || kind === "lodging";
}

function pillForKind(kind: StopKind): ItineraryStopPill {
  if (kind === "reservation") return { label: "Reservation", tone: "reservation" };
  if (kind === "lodging") return { label: "Lodging", tone: "activity" };
  if (kind === "transit") return { label: "Transit", tone: "transit" };
  if (kind === "walk") return { label: "Walk", tone: "activity" };
  return { label: "Activity", tone: "activity" };
}

function classifyItineraryItem(item: ItineraryItem): StopKind {
  const haystack = [
    item.title,
    item.location,
    item.notes,
    item.booked_by,
    item.handled_by,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(train|flight|airport|bus|ferry|taxi|transfer|drive|metro|subway|station)\b/.test(haystack)) {
    return "transit";
  }

  if (/\b(hotel|check[ -]?in|lodging|accommodation|inn|ryokan|hostel)\b/.test(haystack)) {
    return "lodging";
  }

  if (/\b(walk|stroll|hike|trail|wander)\b/.test(haystack)) {
    return "walk";
  }

  if (
    item.status === "confirmed" ||
    Boolean(item.booked_by?.trim()) ||
    /\b(reservation|reserved|dinner|lunch|brunch|restaurant|ticket|show|ceremony)\b/.test(haystack)
  ) {
    return "reservation";
  }

  return "activity";
}

export function formatItineraryDayDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;

  const monthDay = d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toUpperCase();
  const weekday = d
    .toLocaleDateString(undefined, { weekday: "short" })
    .toUpperCase();
  return `${monthDay} · ${weekday}`;
}

export function formatItineraryStopTime(time: string | null): ItineraryStopTimeBlock {
  const raw = time?.trim();
  if (!raw) return { primary: "TBD", secondary: null };

  const clockMatch = raw.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[AP]M)?\b/i);
  const clock = clockMatch?.[0]?.replace(/\s+/g, " ").toUpperCase() ?? null;
  const period = normalizePeriodLabel(raw);

  if (period && clock) return { primary: period, secondary: clock };
  if (clock) return { primary: clock, secondary: period };
  if (period) return { primary: period, secondary: null };

  return { primary: compactLooseTimeLabel(raw), secondary: null };
}

function normalizePeriodLabel(value: string): string | null {
  const normalized = value.toLowerCase();
  if (/\bearly\s+morning\b/.test(normalized)) return "Early AM";
  if (/\blate\s+morning\b/.test(normalized)) return "Late AM";
  if (/\bmorning\b/.test(normalized)) return "Morning";
  if (/\bearly\s+afternoon\b/.test(normalized)) return "Early PM";
  if (/\blate\s+afternoon\b/.test(normalized)) return "Late PM";
  if (/\bafternoon\b/.test(normalized)) return "Afternoon";
  if (/\bearly\s+evening\b/.test(normalized)) return "Early Eve";
  if (/\blate\s+evening\b/.test(normalized)) return "Late Eve";
  if (/\bevening\b/.test(normalized)) return "Evening";
  if (/\bnight\b/.test(normalized)) return "Night";
  return null;
}

function compactLooseTimeLabel(value: string): string {
  const label = value.replace(/\s+/g, " ").trim();
  if (label.length <= 10) return label;
  const compacted = label
    .replace(/\bapproximately\b/i, "Approx.")
    .replace(/\bafternoon\b/i, "PM")
    .replace(/\bmorning\b/i, "AM")
    .replace(/\bevening\b/i, "Eve");
  if (compacted.length <= 10) return compacted;

  const firstWord = compacted.split(" ")[0];
  return firstWord && firstWord.length <= 10 ? firstWord : "Time";
}

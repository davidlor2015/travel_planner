// Path: ui-mobile/features/trips/workspace/itineraryPresentation.ts
// Summary: Implements itineraryPresentation module logic.

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import { formatTripStopTime } from "@/features/trips/stopTime";

export type ItineraryFilterKey = "all" | "activities" | "transit" | "reservations";

export const ITINERARY_FILTERS: { key: ItineraryFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activities", label: "Activities" },
  { key: "transit", label: "Transit" },
  { key: "reservations", label: "Reservations" },
];

export type ItineraryStopPill = {
  label: string;
  tone: "activity" | "reservation" | "transit" | "meal" | "walk";
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

type StopKind = "activity" | "lodging" | "walk" | "transit" | "reservation" | "meal";

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
  if (filter === "activities")
    return kind === "activity" || kind === "walk" || kind === "meal";
  if (filter === "transit") return kind === "transit";
  return kind === "reservation" || kind === "lodging";
}

function pillForKind(kind: StopKind): ItineraryStopPill {
  if (kind === "reservation") return { label: "Reservation", tone: "reservation" };
  if (kind === "lodging") return { label: "Lodging", tone: "activity" };
  if (kind === "transit") return { label: "Transit", tone: "transit" };
  if (kind === "meal") return { label: "Meal", tone: "meal" };
  if (kind === "walk") return { label: "Walk", tone: "walk" };
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
    /\b(breakfast|brunch|lunch|dinner|snack|coffee|cafe|restaurant|izakaya|bistro|bar)\b/.test(
      haystack,
    )
  ) {
    return "meal";
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
  return {
    primary: formatTripStopTime(time),
    secondary: null,
  };
}

// Path: ui-mobile/features/trips/workspace/overviewItineraryPreview.ts
// Summary: Implements overviewItineraryPreview module logic.

import type { Itinerary, ItineraryItem, ItineraryStopStatus } from "@/features/ai/api";

export type OverviewItineraryDayPreview = {
  dayNumber: number;
  dateLabel: string | null;
  dayTitle: string;
  stopPreviewLine: string;
  stopCountLabel: string;
  statusSummary: string | null;
  locationSummary: string | null;
  metaLine: string;
  hasStops: boolean;
};

const STATUS_ORDER: ItineraryStopStatus[] = ["planned", "confirmed", "skipped"];

function formatDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toUpperCase();
}

function pluralStops(value: number): string {
  return `${value} ${value === 1 ? "stop" : "stops"}`;
}

function toStopPreviewLabel(item: ItineraryItem): string {
  const title = item.title?.trim();
  if (title) return title;
  const location = item.location?.trim();
  if (location) return location;
  return "Untitled stop";
}

function toAreaLabel(location: string | null | undefined): string | null {
  const raw = location?.trim();
  if (!raw) return null;
  const primary = raw.split(",")[0]?.trim() ?? raw;
  return primary || raw;
}

function buildStatusSummary(items: ItineraryItem[]): string | null {
  const explicitStatuses = items
    .map((item) => item.status)
    .filter((status): status is ItineraryStopStatus =>
      status === "planned" || status === "confirmed" || status === "skipped",
    );

  if (explicitStatuses.length === 0) return null;

  const counts = STATUS_ORDER.reduce<Record<ItineraryStopStatus, number>>(
    (acc, status) => {
      acc[status] = explicitStatuses.filter((value) => value === status).length;
      return acc;
    },
    { planned: 0, confirmed: 0, skipped: 0 },
  );

  const parts: string[] = [];
  STATUS_ORDER.forEach((status) => {
    const count = counts[status];
    if (count > 0) {
      parts.push(`${count} ${status}`);
    }
  });

  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildDayPreview(day: Itinerary["days"][number]): OverviewItineraryDayPreview {
  const stops = day.items ?? [];
  const hasStops = stops.length > 0;
  const stopPreviewLine = hasStops
    ? stops.slice(0, 3).map(toStopPreviewLabel).join(" \u2192 ")
    : "No stops planned yet.";
  const stopCountLabel = pluralStops(stops.length);
  const locationSummary = toAreaLabel(stops.find((item) => item.location?.trim())?.location);
  const statusSummary = buildStatusSummary(stops);
  const metaLine = [stopCountLabel, locationSummary, statusSummary]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return {
    dayNumber: day.day_number,
    dateLabel: formatDateLabel(day.date),
    dayTitle: day.day_title?.trim() || `Day ${day.day_number}`,
    stopPreviewLine,
    stopCountLabel,
    statusSummary,
    locationSummary,
    metaLine: metaLine || stopCountLabel,
    hasStops,
  };
}

export function buildOverviewItineraryDayPreviews(
  itinerary: Itinerary | null,
  options?: { maxDays?: number },
): OverviewItineraryDayPreview[] {
  if (!itinerary?.days?.length) return [];
  const maxDays = options?.maxDays ?? 3;
  return itinerary.days.slice(0, maxDays).map(buildDayPreview);
}

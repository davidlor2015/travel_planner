// Path: ui-mobile/features/today/todayPresentation.ts
// Summary: Implements todayPresentation module logic.

import type { TripOnTripStopSnapshot } from "@/features/trips/types";

/** First segment of "City, Country" for compact labels. */
export function shortDestination(destination: string): string {
  const parts = destination
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] ?? destination.trim();
}

/** Inclusive calendar days from ISO start/end (trip length). */
export function totalTripDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

/** Masthead line: "Saturday · Apr 26" (design canvas). */
export function todayMastheadKicker(now: Date = new Date()): string {
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const rest = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekday} · ${rest}`;
}

/** Hero kicker over image: "Day 3 of 9 · Marrakech". */
export function buildTodayHeroEyebrow(
  dayNumber: number | null | undefined,
  totalDays: number,
  destination: string,
): string {
  const place = shortDestination(destination) || "Trip";
  if (typeof dayNumber === "number" && dayNumber > 0 && totalDays > 0) {
    return `Day ${dayNumber} of ${totalDays} · ${place}`;
  }
  return place;
}

export function resolveTodayStopIndex(
  stops: TripOnTripStopSnapshot[],
  target: TripOnTripStopSnapshot,
): number {
  if (target.stop_ref) {
    const byRef = stops.findIndex((s) => s.stop_ref === target.stop_ref);
    if (byRef >= 0) return byRef;
  }
  return stops.findIndex(
    (s) =>
      s.title === target.title && s.time === target.time && s.location === target.location,
  );
}

/** Google Maps URL from coordinates or free-text location. */
export function buildStopDirectionsUrl(stop: TripOnTripStopSnapshot): string | null {
  const { lat, lon } = stop;
  if (
    lat != null &&
    lon != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  const loc = stop.location?.trim();
  if (loc) return `https://maps.google.com/?q=${encodeURIComponent(loc)}`;
  return null;
}

export function stopDetailRouteKey(
  stop: TripOnTripStopSnapshot,
  stops: TripOnTripStopSnapshot[],
): string | null {
  if (stop.stop_ref) return stop.stop_ref;
  const idx = stops.indexOf(stop);
  if (idx >= 0) return `stop-${idx}`;
  return null;
}

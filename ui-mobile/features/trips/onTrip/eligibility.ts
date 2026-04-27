// Path: ui-mobile/features/trips/onTrip/eligibility.ts
// Summary: Implements eligibility module logic.

import type { TripListItem, TripOnTripSnapshot, TripOnTripStopSnapshot } from "../types";

export function hasResolvedTodayStop(snapshot: TripOnTripSnapshot | null): boolean {
  if (!snapshot || snapshot.mode !== "active") return false;

  return snapshot.today_stops.some(isResolvedStop);
}

export function isResolvedStop(stop: TripOnTripStopSnapshot | null | undefined): boolean {
  return Boolean(
    stop &&
      stop.stop_ref?.trim() &&
      stop.title?.trim(),
  );
}

export function canOpenOnTrip(
  status: TripListItem["status"],
  snapshot: TripOnTripSnapshot | null,
): boolean {
  return status === "active" && hasResolvedTodayStop(snapshot);
}

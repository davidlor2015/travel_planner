// Path: ui-mobile/features/profile/profileUtils.ts
// Summary: Implements profileUtils module logic.

import type { TripListItemViewModel } from "../trips/adapters";

export type TravelStats = {
  totalTrips: number;
  activeOrUpcoming: number;
  pastTrips: number;
};

export function computeTravelStats(trips: TripListItemViewModel[]): TravelStats {
  return {
    totalTrips: trips.length,
    activeOrUpcoming: trips.filter((t) => t.status === "upcoming" || t.status === "active").length,
    pastTrips: trips.filter((t) => t.status === "past").length,
  };
}

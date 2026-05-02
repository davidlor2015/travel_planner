// Path: ui-mobile/features/today/useTodayModel.ts
// Summary: Provides useTodayModel hook behavior.

import { useMemo } from "react";

import { getTripStatus } from "@/features/trips/adapters";
import { useTripsQuery } from "@/features/trips/hooks";
import type { TripResponse } from "@/features/trips/types";

export interface TodayModel {
  isLoading: boolean;
  activeTrip: TripResponse | null;
  nextUpcomingTrip: TripResponse | null;
  daysUntilNextTrip: number | null;
}

export function useTodayModel(): TodayModel {
  const tripsQuery = useTripsQuery();

  const { activeTrip, nextUpcomingTrip, daysUntilNextTrip } = useMemo(() => {
    const trips = tripsQuery.data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active =
      trips.find((t) => getTripStatus(t.start_date, t.end_date) === "active") ??
      null;

    const upcoming =
      trips
        .filter((t) => getTripStatus(t.start_date, t.end_date) === "upcoming")
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        )[0] ?? null;

    const daysUntil = upcoming
      ? Math.ceil(
          (new Date(upcoming.start_date).setHours(0, 0, 0, 0) -
            today.getTime()) /
            86_400_000,
        )
      : null;

    return { activeTrip: active, nextUpcomingTrip: upcoming, daysUntilNextTrip: daysUntil };
  }, [tripsQuery.data]);

  return {
    isLoading: tripsQuery.isLoading,
    activeTrip,
    nextUpcomingTrip,
    daysUntilNextTrip,
  };
}

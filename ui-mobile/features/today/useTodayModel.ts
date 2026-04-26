import { useMemo } from "react";

import { getTripStatus } from "@/features/trips/adapters";
import { useTripsQuery, useOnTripSnapshotQuery } from "@/features/trips/hooks";
import type { TripOnTripStopSnapshot, TripResponse } from "@/features/trips/types";

export interface TodayModel {
  isLoading: boolean;
  activeTrip: TripResponse | null;
  nextUpcomingTrip: TripResponse | null;
  daysUntilNextTrip: number | null;
  nextStop: TripOnTripStopSnapshot | null;
  laterStop: TripOnTripStopSnapshot | null;
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

  const snapshotQuery = useOnTripSnapshotQuery(activeTrip?.id ?? null);
  const snapshot = snapshotQuery.data ?? null;

  const nextStop = snapshot?.next_stop?.title ? snapshot.next_stop : null;

  const laterStop = useMemo(() => {
    if (!snapshot?.next_stop?.title) return null;
    const stops = snapshot.today_stops;
    const ref = snapshot.next_stop.stop_ref;
    let startIdx = 0;
    if (ref) {
      const idx = stops.findIndex((s) => s.stop_ref === ref);
      if (idx !== -1) startIdx = idx + 1;
    }
    const candidate = stops[startIdx];
    return candidate?.title ? candidate : null;
  }, [snapshot]);

  return {
    isLoading: tripsQuery.isLoading,
    activeTrip,
    nextUpcomingTrip,
    daysUntilNextTrip,
    nextStop,
    laterStop,
  };
}

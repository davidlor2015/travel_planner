// Path: ui-mobile/features/today/useTodayModel.ts
// Summary: Provides useTodayModel hook behavior.

import { useMemo } from "react";

import { getTripStatus } from "@/features/trips/adapters";
import { useTripsQuery, useOnTripSnapshotQuery } from "@/features/trips/hooks";
import type {
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
  TripResponse,
} from "@/features/trips/types";

import { resolveTodayStopIndex, totalTripDaysInclusive } from "./todayPresentation";

export interface TodayModel {
  isLoading: boolean;
  activeTrip: TripResponse | null;
  nextUpcomingTrip: TripResponse | null;
  daysUntilNextTrip: number | null;
  nextStop: TripOnTripStopSnapshot | null;
  laterStop: TripOnTripStopSnapshot | null;
  snapshot: TripOnTripSnapshot | null;
  totalTripDays: number;
  snapshotIsError: boolean;
  snapshotErrorMessage: string | null;
  refetchSnapshot: () => Promise<unknown>;
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
    const idx = resolveTodayStopIndex(stops, snapshot.next_stop);
    if (idx < 0 || idx + 1 >= stops.length) return null;
    const later = stops[idx + 1]!;
    return later.title ? later : null;
  }, [snapshot]);

  const totalTripDays = activeTrip
    ? totalTripDaysInclusive(activeTrip.start_date, activeTrip.end_date)
    : 1;

  const isLoading =
    tripsQuery.isLoading ||
    (!!activeTrip && snapshotQuery.isLoading && !snapshotQuery.data);

  const snapshotIsError = !!activeTrip && snapshotQuery.isError;
  const snapshotErrorMessage = snapshotQuery.error
    ? snapshotQuery.error instanceof Error
      ? snapshotQuery.error.message
      : "Could not load today’s plan."
    : null;

  return {
    isLoading,
    activeTrip,
    nextUpcomingTrip,
    daysUntilNextTrip,
    nextStop,
    laterStop,
    snapshot,
    totalTripDays,
    snapshotIsError,
    snapshotErrorMessage,
    refetchSnapshot: () => snapshotQuery.refetch(),
  };
}

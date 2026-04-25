import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getTripOnTripSnapshot } from "./api";
import { canOpenOnTrip } from "./onTrip/eligibility";
import {
  toActiveTripViewModel,
  toUpcomingTripViewModel,
  getTripStatus,
} from "./adapters";
import { tripKeys, useTripsQuery, useTripSummariesQuery } from "./hooks";
import type { TripOnTripSnapshot, TripResponse, TripSummary } from "./types";
import type { ActiveTripViewModel, UpcomingTripViewModel } from "./adapters";

export type TripsFilter = "all" | "active" | "upcoming" | "drafts";

export interface TripsListModel {
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;

  query: string;
  setQuery: (q: string) => void;
  filter: TripsFilter;
  setFilter: (f: TripsFilter) => void;

  activeTrips: ActiveTripViewModel[];
  upcomingTrips: UpcomingTripViewModel[];

  journeySubtitle: string;
  allTripsEmpty: boolean;
}

function matchesQuery(trip: TripResponse, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    trip.title.toLowerCase().includes(lower) ||
    trip.destination.toLowerCase().includes(lower)
  );
}

function journeySubtitle(nonPastCount: number): string {
  const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const word = words[nonPastCount] ?? String(nonPastCount);
  return nonPastCount === 1
    ? `${word} journey ahead.`
    : `${word} journeys ahead.`;
}

export function useTripsListModel(): TripsListModel {
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TripsFilter>("all");

  const summaryByTripId = useMemo(() => {
    const map = new Map<number, TripSummary>();
    for (const s of summariesQuery.data ?? []) map.set(s.trip_id, s);
    return map;
  }, [summariesQuery.data]);

  const allTrips = tripsQuery.data ?? [];

  const activeTripIds = useMemo(
    () =>
      allTrips
        .filter((t) => getTripStatus(t.start_date, t.end_date) === "active")
        .map((t) => t.id),
    [allTrips],
  );

  const snapshotQueries = useQueries({
    queries: activeTripIds.map((tripId) => ({
      queryKey: tripKeys.onTripSnapshot(tripId),
      queryFn: () => getTripOnTripSnapshot(tripId),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const snapshotByTripId = useMemo(() => {
    const map = new Map<number, TripOnTripSnapshot>();
    activeTripIds.forEach((id, i) => {
      const data = snapshotQueries[i]?.data;
      if (data) map.set(id, data);
    });
    return map;
  }, [activeTripIds, snapshotQueries]);

  const liveEligibleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const t of allTrips) {
      if (canOpenOnTrip(getTripStatus(t.start_date, t.end_date), snapshotByTripId.get(t.id) ?? null)) {
        ids.add(t.id);
      }
    }
    return ids;
  }, [allTrips, snapshotByTripId]);

  const { activeTrips, upcomingTrips, nonPastCount } = useMemo(() => {
    const queryStr = query.trim().toLowerCase();
    const filtered = allTrips.filter((t) => matchesQuery(t, queryStr));

    const active: ActiveTripViewModel[] = [];
    const upcoming: UpcomingTripViewModel[] = [];
    let nonPast = 0;

    for (const trip of filtered) {
      const status = getTripStatus(trip.start_date, trip.end_date);
      if (status === "past") continue;
      nonPast++;
      if (status === "active") {
        active.push(toActiveTripViewModel(trip, liveEligibleIds.has(trip.id)));
      } else {
        upcoming.push(toUpcomingTripViewModel(trip, summaryByTripId.get(trip.id)));
      }
    }

    return { activeTrips: active, upcomingTrips: upcoming, nonPastCount: nonPast };
  }, [allTrips, query, liveEligibleIds, summaryByTripId]);

  const visibleActiveTrips = useMemo(() => {
    if (filter === "upcoming" || filter === "drafts") return [];
    return activeTrips;
  }, [filter, activeTrips]);

  const visibleUpcomingTrips = useMemo(() => {
    if (filter === "active" || filter === "drafts") return [];
    return upcomingTrips;
  }, [filter, upcomingTrips]);

  const isRefreshing = tripsQuery.isRefetching || summariesQuery.isRefetching;

  return {
    isLoading: tripsQuery.isLoading,
    isError: tripsQuery.isError,
    isRefreshing,
    onRefresh: () => {
      void tripsQuery.refetch();
      void summariesQuery.refetch();
    },
    query,
    setQuery,
    filter,
    setFilter,
    activeTrips: visibleActiveTrips,
    upcomingTrips: visibleUpcomingTrips,
    journeySubtitle: journeySubtitle(nonPastCount),
    allTripsEmpty: allTrips.filter((t) => getTripStatus(t.start_date, t.end_date) !== "past").length === 0,
  };
}

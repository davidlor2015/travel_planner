// Path: ui-mobile/features/trips/archive/useArchiveScreen.ts
// Summary: Provides useArchiveScreen hook behavior.

import { useEffect, useMemo, useState } from "react";

import { getTripExecutionSummary } from "../api";
import { useTripsQuery, useTripSummariesQuery } from "../hooks";
import type { TripExecutionSummary } from "../types";
import {
  filterArchiveTrips,
  groupTripsByYear,
  toArchiveTripViewModel,
  type ArchiveYearGroup,
} from "./archiveUtils";

export type UseArchiveScreenResult = {
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  yearGroups: ArchiveYearGroup[];
  totalCount: number;
  hasNoArchive: boolean;
  hasNoResults: boolean;
};

export function useArchiveScreen(): UseArchiveScreenResult {
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [executionSummaryByTripId, setExecutionSummaryByTripId] = useState<
    Record<number, TripExecutionSummary | null>
  >({});

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastTripIds = (tripsQuery.data ?? [])
      .filter((trip) => today > new Date(trip.end_date))
      .map((trip) => trip.id);

    if (pastTripIds.length === 0) return;

    const missingTripIds = pastTripIds.filter(
      (tripId) => executionSummaryByTripId[tripId] === undefined,
    );
    if (missingTripIds.length === 0) return;

    let cancelled = false;

    void Promise.all(
      missingTripIds.map(async (tripId) => {
        try {
          const summary = await getTripExecutionSummary(tripId);
          return [tripId, summary] as const;
        } catch {
          return [tripId, null] as const;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setExecutionSummaryByTripId((prev) => ({
        ...prev,
        ...Object.fromEntries(rows),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [executionSummaryByTripId, tripsQuery.data]);

  const { yearGroups, allPastCount } = useMemo(() => {
    const summariesById = new Map(
      (summariesQuery.data ?? []).map((s) => [s.trip_id, s]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastTrips = (tripsQuery.data ?? [])
      .filter((t) => today > new Date(t.end_date))
      .map((t) =>
        toArchiveTripViewModel(
          t,
          summariesById.get(t.id),
          executionSummaryByTripId[t.id],
        ),
      );

    const filtered = filterArchiveTrips(pastTrips, searchQuery);

    return {
      yearGroups: groupTripsByYear(filtered),
      allPastCount: pastTrips.length,
    };
  }, [executionSummaryByTripId, searchQuery, summariesQuery.data, tripsQuery.data]);

  const totalCount = yearGroups.reduce((sum, g) => sum + g.data.length, 0);

  return {
    isLoading: tripsQuery.isLoading,
    searchQuery,
    setSearchQuery,
    yearGroups,
    totalCount,
    hasNoArchive: !tripsQuery.isLoading && allPastCount === 0,
    hasNoResults: !tripsQuery.isLoading && allPastCount > 0 && totalCount === 0,
  };
}

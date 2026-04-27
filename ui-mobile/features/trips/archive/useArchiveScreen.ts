// Path: ui-mobile/features/trips/archive/useArchiveScreen.ts
// Summary: Provides useArchiveScreen hook behavior.

import { useMemo, useState } from "react";

import { useTripsQuery, useTripSummariesQuery } from "../hooks";
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

  const { yearGroups, allPastCount } = useMemo(() => {
    const summariesById = new Map(
      (summariesQuery.data ?? []).map((s) => [s.trip_id, s]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastTrips = (tripsQuery.data ?? [])
      .filter((t) => today > new Date(t.end_date))
      .map((t) => toArchiveTripViewModel(t, summariesById.get(t.id)));

    const filtered = filterArchiveTrips(pastTrips, searchQuery);

    return {
      yearGroups: groupTripsByYear(filtered),
      allPastCount: pastTrips.length,
    };
  }, [tripsQuery.data, summariesQuery.data, searchQuery]);

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

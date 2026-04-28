// Path: ui/src/features/archive/hooks/useArchiveTrips.ts
// Summary: Provides useArchiveTrips hook behavior.

import { useEffect, useMemo, useState } from "react";
import {
  getTripExecutionSummary,
  type Trip,
  type TripExecutionSummary,
} from "../../../shared/api/trips";
import type {
  ArchiveSummaryLine,
  ArchiveTripItem,
  ArchiveYearGroup,
} from "../types";
import {
  buildArchiveSummaryLine,
  filterArchiveTrips,
  formatArchiveMetadata,
  getArchiveTrips,
  groupArchiveTripsByYear,
} from "../adapters/archiveAdapter";

interface UseArchiveTripsResult {
  loading: boolean;
  error: string | null;
  trips: ArchiveTripItem[];
  groupedTrips: ArchiveYearGroup[];
  heroTrip: ArchiveTripItem | undefined;
  summary: ArchiveSummaryLine;
  summaryText: string;
}

export function useArchiveTrips(
  trips: Trip[],
  query: string,
  token: string,
): UseArchiveTripsResult {
  const [executionSummaryByTripId, setExecutionSummaryByTripId] = useState<
    Record<number, TripExecutionSummary | null>
  >({});

  const baseArchiveTrips = useMemo(() => getArchiveTrips(trips), [trips]);

  useEffect(() => {
    const archiveTripIds = baseArchiveTrips.map((trip) => trip.id);
    if (archiveTripIds.length === 0) return;

    const missingTripIds = archiveTripIds.filter(
      (tripId) => executionSummaryByTripId[tripId] === undefined,
    );
    if (missingTripIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      missingTripIds.map(async (tripId) => {
        try {
          const summary = await getTripExecutionSummary(token, tripId);
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
  }, [baseArchiveTrips, executionSummaryByTripId, token]);

  const archiveTrips = useMemo(
    () => getArchiveTrips(trips, executionSummaryByTripId),
    [trips, executionSummaryByTripId],
  );
  const filteredTrips = useMemo(
    () => filterArchiveTrips(archiveTrips, query),
    [archiveTrips, query],
  );
  const groupedTrips = useMemo(
    () => groupArchiveTripsByYear(filteredTrips),
    [filteredTrips],
  );
  const summary = useMemo(
    () => buildArchiveSummaryLine(archiveTrips),
    [archiveTrips],
  );

  return {
    loading: false,
    error: null,
    trips: archiveTrips,
    groupedTrips,
    heroTrip: archiveTrips[0],
    summary,
    summaryText: formatArchiveMetadata(summary),
  };
}

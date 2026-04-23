import { useMemo } from "react";
import type { Trip } from "../../../shared/api/trips";
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
): UseArchiveTripsResult {
  const archiveTrips = useMemo(() => getArchiveTrips(trips), [trips]);
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

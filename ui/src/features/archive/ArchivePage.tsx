// Path: ui/src/features/archive/ArchivePage.tsx
// Summary: Implements ArchivePage module logic.

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { AppView } from "../../app/AppShell";
import type { Trip } from "../../shared/api/trips";
import { track } from "../../shared/analytics";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../shared/ui";
import type { ArchiveViewMode } from "./types";
import {
  ArchiveHeader,
  ArchiveToolbar,
  ArchiveYearGroupList,
} from "./components";
import { useArchiveTrips } from "./hooks/useArchiveTrips";

const TRIP_RATINGS_STORAGE_KEY = "waypoint.archive.tripRatings.v1";

type TripRatingsMap = Record<number, number>;

interface ArchivePageProps {
  trips: Trip[];
  onNavigate: (view: AppView, tripId?: number) => void;
  onCreateFromDestination: (destination: string) => void;
}

function loadTripRatings(): TripRatingsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRIP_RATINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: TripRatingsMap = {};

    for (const [tripId, rating] of Object.entries(parsed)) {
      const num = Number(rating);
      if (Number.isFinite(num) && num >= 1 && num <= 5) {
        normalized[Number(tripId)] = Math.round(num);
      }
    }

    return normalized;
  } catch {
    return {};
  }
}

function saveTripRatings(ratings: TripRatingsMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TRIP_RATINGS_STORAGE_KEY,
      JSON.stringify(ratings),
    );
  } catch {
    // Ignore local persistence failures.
  }
}

export function ArchivePage({
  trips,
  onNavigate,
  onCreateFromDestination,
}: ArchivePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tripRatings, setTripRatings] = useState<TripRatingsMap>(() =>
    loadTripRatings(),
  );

  const query = searchParams.get("q") ?? "";
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  const {
    loading,
    error,
    trips: archiveTrips,
    groupedTrips,
    heroTrip,
    summaryText,
  } = useArchiveTrips(trips, query);

  useEffect(() => {
    saveTripRatings(tripRatings);
  }, [tripRatings]);

  const updateSearchParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const setView = (nextView: ArchiveViewMode) =>
    updateSearchParam("view", nextView === "grid" ? "" : nextView);

  const onRateTrip = (tripId: number, rating: number) => {
    setTripRatings((prev) => ({ ...prev, [tripId]: rating }));
    track({ name: "archive_trip_rated", props: { trip_id: tripId, rating } });
  };

  const onCopyTripLink = async (tripId: number): Promise<boolean> => {
    const tripUrl = `${window.location.origin}/app/trips/${tripId}`;
    try {
      await navigator.clipboard.writeText(tripUrl);
      track({ name: "archive_trip_link_copied", props: { trip_id: tripId } });
      return true;
    } catch {
      track({
        name: "archive_trip_link_copy_failed",
        props: { trip_id: tripId },
      });
      return false;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-40" />
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-8">
      <ArchiveHeader heroImage={heroTrip?.imageUrl} metadata={summaryText} />

      <ArchiveToolbar
        query={query}
        onQueryChange={(value) => updateSearchParam("q", value)}
        view={view}
        onViewChange={setView}
      />

      {archiveTrips.length === 0 ? (
        <EmptyState
          title="Your memories are waiting for the first return."
          description="Finished trips settle here so you can revisit dates, places, companions, and saved plans from each journey."
          action={
            <ActionButton onClick={() => onNavigate("trips")}>
              Open Trips
            </ActionButton>
          }
        />
      ) : groupedTrips.length === 0 ? (
        <EmptyState
          title="No memories match that search."
          description="Try a destination, year, or trip name from your memories."
          action={
            <ActionButton onClick={() => updateSearchParam("q", "")}>
              Clear Search
            </ActionButton>
          }
        />
      ) : (
        <ArchiveYearGroupList
          groups={groupedTrips}
          view={view}
          ratings={tripRatings}
          onViewTrip={(tripId) => onNavigate("trips", tripId)}
          onReuseTrip={onCreateFromDestination}
          onCopyTripLink={onCopyTripLink}
          onRateTrip={onRateTrip}
        />
      )}
    </div>
  );
}

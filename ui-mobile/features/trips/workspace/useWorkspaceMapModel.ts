// Path: ui-mobile/features/trips/workspace/useWorkspaceMapModel.ts
// Summary: Provides useWorkspaceMapModel hook behavior.

import { useEffect, useMemo, useState } from "react";

import { useSavedItineraryQuery } from "@/features/ai/hooks";
import { ApiError } from "@/shared/api/client";

import {
  buildMapTabViewModel,
  type MapFilterKey,
  MAP_FILTERS,
} from "./mapPresentation";

type Options = {
  tripId: number;
  enabled?: boolean;
};

export type WorkspaceMapModel = {
  query: string;
  filter: MapFilterKey;
  filters: typeof MAP_FILTERS;
  isLoading: boolean;
  isMissing: boolean;
  error: string | null;
  hasItinerary: boolean;
  hasVisibleStops: boolean;
  markers: ReturnType<typeof buildMapTabViewModel>["markers"];
  nearbyStops: ReturnType<typeof buildMapTabViewModel>["nearbyStops"];
  visibleStopCount: number;
  totalStopCount: number;
  setQuery: (value: string) => void;
  setFilter: (value: MapFilterKey) => void;
  resetSearch: () => void;
};

export function useWorkspaceMapModel({
  tripId,
  enabled = true,
}: Options): WorkspaceMapModel {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MapFilterKey>("today");

  const itineraryQuery = useSavedItineraryQuery(tripId, { enabled });
  const itinerary = itineraryQuery.data ?? null;

  useEffect(() => {
    setQuery("");
    setFilter("today");
  }, [tripId]);

  const isMissing =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    itineraryQuery.error.status === 404;

  const error =
    itineraryQuery.isError && !isMissing
      ? "We couldn't load the trip map right now. Try again in a moment."
      : null;

  const viewModel = useMemo(() => {
    if (!itinerary) {
      return {
        markers: [],
        nearbyStops: [],
        visibleStopCount: 0,
        totalStopCount: 0,
      };
    }

    return buildMapTabViewModel(itinerary, { filter, query });
  }, [filter, itinerary, query]);

  return {
    query,
    filter,
    filters: MAP_FILTERS,
    isLoading: itineraryQuery.isLoading,
    isMissing,
    error,
    hasItinerary: Boolean(itinerary),
    hasVisibleStops: viewModel.visibleStopCount > 0,
    markers: viewModel.markers,
    nearbyStops: viewModel.nearbyStops,
    visibleStopCount: viewModel.visibleStopCount,
    totalStopCount: viewModel.totalStopCount,
    setQuery,
    setFilter,
    resetSearch: () => setQuery(""),
  };
}

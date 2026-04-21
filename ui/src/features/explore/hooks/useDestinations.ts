import { useMemo } from "react";
import type {
  Destination,
  DestinationMood,
} from "../../shared/types/destination.types";
import {
  getDestinations,
  getEditorsPicks,
  getFeaturedDestinations,
  getRecommendedForPlannedDestinations,
  listDestinationMoods,
} from "../adapters/destinationExploreAdapter";

interface UseDestinationsParams {
  plannedDestinations: string[];
  query: string;
  mood: DestinationMood | null;
}

interface UseDestinationsResult {
  loading: boolean;
  error: string | null;
  moods: DestinationMood[];
  destinations: Destination[];
  editorsPicks: Destination[];
  featuredDestinations: Destination[];
  recommendedDestinations: Destination[];
}

export function useDestinations({
  plannedDestinations,
  query,
  mood,
}: UseDestinationsParams): UseDestinationsResult {
  const moods = useMemo(() => listDestinationMoods(), []);
  const destinations = useMemo(
    () => getDestinations({ query, mood }),
    [query, mood],
  );
  const editorsPicks = useMemo(() => getEditorsPicks(), []);
  const featuredDestinations = useMemo(() => getFeaturedDestinations(), []);
  const recommendedDestinations = useMemo(
    () => getRecommendedForPlannedDestinations(plannedDestinations),
    [plannedDestinations],
  );

  return {
    loading: false,
    error: null,
    moods,
    destinations,
    editorsPicks,
    featuredDestinations,
    recommendedDestinations,
  };
}

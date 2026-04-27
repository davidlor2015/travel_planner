// Path: ui-mobile/features/explore/useExploreScreen.ts
// Summary: Provides useExploreScreen hook behavior.

import { useMemo, useState } from "react";

import { toFeaturedCardViewModel, toGridCardViewModel } from "./adapters";
import { getFeaturedDestinations, getDestinations, listDestinationMoods } from "./catalog";
import type { DestinationMood, FeaturedCardViewModel, GridCardViewModel } from "./types";

export interface ExploreScreenModel {
  query: string;
  setQuery: (q: string) => void;
  activeMood: DestinationMood | null;
  setActiveMood: (mood: DestinationMood | null) => void;
  moods: DestinationMood[];
  isFiltering: boolean;
  showFeatured: boolean;
  featuredCards: FeaturedCardViewModel[];
  moreToConsiderCards: GridCardViewModel[];
  filteredCards: GridCardViewModel[];
  hasResults: boolean;
}

export function useExploreScreen(): ExploreScreenModel {
  const [query, setQuery] = useState("");
  const [activeMood, setActiveMood] = useState<DestinationMood | null>(null);

  const moods = useMemo(() => listDestinationMoods(), []);

  const isFiltering = query.trim().length > 0 || activeMood !== null;

  const featuredCards = useMemo(
    () => getFeaturedDestinations().map(toFeaturedCardViewModel),
    [],
  );

  const filtered = useMemo(
    () => getDestinations({ query, mood: activeMood }),
    [query, activeMood],
  );

  // When not filtering: exclude featured destinations from the grid to avoid duplication.
  // When filtering: show all matching results (including featured ones) in the grid.
  const moreToConsiderCards = useMemo(
    () =>
      isFiltering
        ? filtered.map(toGridCardViewModel)
        : filtered.filter((d) => !d.isFeatured).map(toGridCardViewModel),
    [isFiltering, filtered],
  );

  const filteredCards = useMemo(() => filtered.map(toGridCardViewModel), [filtered]);

  const showFeatured = !isFiltering && featuredCards.length > 0;
  const hasResults = moreToConsiderCards.length > 0;

  return {
    query,
    setQuery,
    activeMood,
    setActiveMood,
    moods,
    isFiltering,
    showFeatured,
    featuredCards,
    moreToConsiderCards,
    filteredCards,
    hasResults,
  };
}

// Path: ui-mobile/features/explore/useExploreScreen.ts
// Summary: Provides useExploreScreen hook behavior.

import { useMemo, useState } from "react";

import { toFeaturedCardViewModel, toGridCardViewModel } from "./adapters";
import { getFeaturedDestinations, getDestinations, listDestinationThemes } from "./catalog";
import type { DestinationTheme, FeaturedCardViewModel, GridCardViewModel } from "./types";

export interface ExploreScreenModel {
  query: string;
  setQuery: (q: string) => void;
  activeTheme: DestinationTheme | null;
  setActiveTheme: (theme: DestinationTheme | null) => void;
  themes: DestinationTheme[];
  isFiltering: boolean;
  showFeatured: boolean;
  featuredCards: FeaturedCardViewModel[];
  moreToConsiderCards: GridCardViewModel[];
  filteredCards: GridCardViewModel[];
  hasResults: boolean;
  planTripDestination: string | null;
  openPlanTrip: (destination: string) => void;
  closePlanTrip: () => void;
}

export function useExploreScreen(): ExploreScreenModel {
  const [query, setQuery] = useState("");
  const [activeTheme, setActiveTheme] = useState<DestinationTheme | null>(null);
  const [planTripDestination, setPlanTripDestination] = useState<string | null>(null);

  const themes = useMemo(() => listDestinationThemes(), []);

  const isFiltering = query.trim().length > 0 || activeTheme !== null;

  const featuredCards = useMemo(
    () => getFeaturedDestinations().map(toFeaturedCardViewModel),
    [],
  );

  const filtered = useMemo(
    () => getDestinations({ query, theme: activeTheme }),
    [query, activeTheme],
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
    activeTheme,
    setActiveTheme,
    themes,
    isFiltering,
    showFeatured,
    featuredCards,
    moreToConsiderCards,
    filteredCards,
    hasResults,
    planTripDestination,
    openPlanTrip: setPlanTripDestination,
    closePlanTrip: () => setPlanTripDestination(null),
  };
}

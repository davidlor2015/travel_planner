import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../shared/ui";
import type { DestinationMood } from "../shared/types/destination.types";
import { useDestinations } from "./hooks/useDestinations";
import {
  CategoryChipRow,
  DestinationGridSection,
  DestinationSearchBar,
  EditorsPicksCarousel,
  ExploreHeroSection,
  FeaturedDestinationsSection,
  RecommendedDestinationsSection,
} from "./sections";

interface ExplorePageProps {
  plannedDestinations: string[];
  onStartTrip: (destination: string) => void;
}

export function ExplorePage({
  plannedDestinations,
  onStartTrip,
}: ExplorePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedDestinationIds, setSavedDestinationIds] = useState<Set<number>>(
    () => new Set(),
  );

  const query = searchParams.get("q") ?? "";
  const moodParam = searchParams.get("mood");
  const activeMood = (moodParam as DestinationMood | null) ?? null;

  const {
    loading,
    error,
    moods,
    destinations,
    editorsPicks,
    featuredDestinations,
    recommendedDestinations,
  } = useDestinations({
    plannedDestinations,
    query,
    mood: activeMood,
  });

  const updateParam = (key: "q" | "mood", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("mood");
    setSearchParams(next, { replace: true });
  };

  const toggleSavedDestination = (id: number) => {
    setSavedDestinationIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton className="h-40" />
        <LoadingSkeleton className="h-56" />
        <LoadingSkeleton className="h-56" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const hasDestinationContent = destinations.length > 0;

  return (
    <div className="space-y-16 pb-12 sm:space-y-20">
      <ExploreHeroSection />

      <DestinationSearchBar
        query={query}
        onQueryChange={(value) => updateParam("q", value)}
      />

      {moods.length > 0 ? (
        <CategoryChipRow
          moods={moods}
          activeMood={activeMood}
          onMoodChange={(mood) => updateParam("mood", mood ?? "")}
        />
      ) : null}

      {!hasDestinationContent ? (
        <EmptyState
          title="No destinations available yet"
          description="Create your first trip to start building your destination library here."
          action={
            <ActionButton onClick={clearFilters}>Reset Filters</ActionButton>
          }
        />
      ) : null}

      {editorsPicks.length > 0 ? (
        <EditorsPicksCarousel
          destinations={editorsPicks}
          onStartTrip={onStartTrip}
        />
      ) : null}

      {featuredDestinations.length > 0 ? (
        <FeaturedDestinationsSection
          destinations={featuredDestinations}
          onStartTrip={onStartTrip}
          savedDestinationIds={savedDestinationIds}
          onToggleSave={toggleSavedDestination}
        />
      ) : null}

      {hasDestinationContent ? (
        <DestinationGridSection
          destinations={destinations}
          onStartTrip={onStartTrip}
          savedDestinationIds={savedDestinationIds}
          onToggleSave={toggleSavedDestination}
          onClearFilters={clearFilters}
        />
      ) : null}

      <RecommendedDestinationsSection
        destinations={recommendedDestinations}
        onStartTrip={onStartTrip}
        savedDestinationIds={savedDestinationIds}
        onToggleSave={toggleSavedDestination}
      />
    </div>
  );
}

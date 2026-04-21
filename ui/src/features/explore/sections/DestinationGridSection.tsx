import { ActionButton, EmptyState, PageSection } from "../../../shared/ui";
import type { Destination } from "../../shared/types/destination.types";
import { DestinationCard } from "../components/DestinationCard";

interface DestinationGridSectionProps {
  destinations: Destination[];
  onStartTrip: (destination: string) => void;
  savedDestinationIds: Set<number>;
  onToggleSave: (id: number) => void;
  onClearFilters: () => void;
}

export function DestinationGridSection({
  destinations,
  onStartTrip,
  savedDestinationIds,
  onToggleSave,
  onClearFilters,
}: DestinationGridSectionProps) {
  return (
    <section className="space-y-5 rounded-[2rem] bg-parchment/60 px-4 py-6 sm:px-6 sm:py-8">
      <PageSection
        title="All Destinations"
        actions={
          <p className="text-sm font-medium text-muted">
            {destinations.length} place{destinations.length === 1 ? "" : "s"}
          </p>
        }
      >
        {destinations.length === 0 ? (
          <EmptyState
            title="No places match that search yet."
            description="Try a region, mood, or broader travel idea and keep the search exploratory."
            action={
              <ActionButton onClick={onClearFilters}>
                Clear Filters
              </ActionButton>
            }
          />
        ) : (
          <div className="grid gap-5 min-[580px]:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                onStartTrip={onStartTrip}
                isSaved={savedDestinationIds.has(destination.id)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        )}
      </PageSection>
    </section>
  );
}

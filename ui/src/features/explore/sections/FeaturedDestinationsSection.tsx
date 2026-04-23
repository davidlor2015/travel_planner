import { PageSection } from "../../../shared/ui";
import type { Destination } from "../types";
import { FeaturedDestinationCard } from "../components/FeaturedDestinationCard";

interface FeaturedDestinationsSectionProps {
  destinations: Destination[];
  onStartTrip: (destination: string) => void;
  savedDestinationIds: Set<number>;
  onToggleSave: (id: number) => void;
}

export function FeaturedDestinationsSection({
  destinations,
  onStartTrip,
  savedDestinationIds,
  onToggleSave,
}: FeaturedDestinationsSectionProps) {
  return (
    <PageSection
      title="Featured Destinations"
      subtitle="Two cinematic places to open, shape, and turn into a shared Waypoint trip."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {destinations.map((destination) => (
          <FeaturedDestinationCard
            key={destination.id}
            destination={destination}
            onStartTrip={onStartTrip}
            isSaved={savedDestinationIds.has(destination.id)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </PageSection>
  );
}

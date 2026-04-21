import { PageSection } from "../../../shared/ui";
import type { Destination } from "../../shared/types/destination.types";
import { DestinationCard } from "../components/DestinationCard";

interface RecommendedDestinationsSectionProps {
  destinations: Destination[];
  onStartTrip: (destination: string) => void;
  savedDestinationIds: Set<number>;
  onToggleSave: (id: number) => void;
}

export function RecommendedDestinationsSection({
  destinations,
  onStartTrip,
  savedDestinationIds,
  onToggleSave,
}: RecommendedDestinationsSectionProps) {
  if (destinations.length === 0) return null;

  return (
    <PageSection
      title="Recommended for You"
      subtitle="A lighter set of places based on trips you have not started yet."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            recommendation
            onStartTrip={onStartTrip}
            isSaved={savedDestinationIds.has(destination.id)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </PageSection>
  );
}

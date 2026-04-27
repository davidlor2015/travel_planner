// Path: ui/src/features/explore/sections/EditorsPicksCarousel.tsx
// Summary: Implements EditorsPicksCarousel module logic.

import { PageSection } from "../../../shared/ui";
import type { Destination } from "../types";
import { EditorialPickCard } from "../components/EditorialPickCard";

interface EditorsPicksCarouselProps {
  destinations: Destination[];
  onStartTrip: (destination: string) => void;
}

export function EditorsPicksCarousel({
  destinations,
  onStartTrip,
}: EditorsPicksCarouselProps) {
  return (
    <PageSection
      title="Editor's Picks"
      subtitle="A short list of destinations with enough texture for a beautiful day-by-day plan."
    >
      <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {destinations.map((destination) => (
          <div
            key={destination.id}
            className="w-[76vw] max-w-[300px] shrink-0 snap-start sm:w-[260px]"
          >
            <EditorialPickCard
              destination={destination}
              onStartTrip={onStartTrip}
            />
          </div>
        ))}
      </div>
    </PageSection>
  );
}

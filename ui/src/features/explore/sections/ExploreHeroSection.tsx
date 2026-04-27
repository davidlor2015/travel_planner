// Path: ui/src/features/explore/sections/ExploreHeroSection.tsx
// Summary: Implements ExploreHeroSection module logic.

import { SectionHeading } from "../../../shared/ui";

export function ExploreHeroSection() {
  return (
    <header className="mx-auto max-w-4xl py-6 text-center sm:py-14">
      <SectionHeading
        eyebrow="Curated by Waypoint"
        title="Where will your next adventure take you?"
        align="center"
        description={
          <p>
            Discover handpicked destinations, curated itinerary ideas, and
            editorial inspiration for the trip your group will actually
            remember.
          </p>
        }
      />
    </header>
  );
}

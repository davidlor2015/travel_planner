import { motion, useReducedMotion } from "framer-motion";
import { EmptyState, SectionHeading } from "../../../shared/ui";
import { EditorialImageCard } from "../components/EditorialImageCard";
import type { LandingDestination } from "../landing.types";

interface LandingInspirationSectionProps {
  destinations: LandingDestination[];
  onGetStarted: () => void;
}

export function LandingInspirationSection({
  destinations,
  onGetStarted,
}: LandingInspirationSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-parchment px-4 py-18 sm:px-6 sm:py-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-6xl"
      >
        <SectionHeading
          eyebrow="Inspiration"
          title="Begin with a place, then make it yours."
          align="center"
          description={
            <p>
              Browse ideas without the pressure of comparison shopping. Each
              destination is simply a starting point for a shared plan.
            </p>
          }
        />

        {destinations.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {destinations.map((destination) => (
              <EditorialImageCard
                key={destination.name}
                destination={destination}
                onGetStarted={onGetStarted}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="Destination inspiration will appear here"
              description="This section fills from curated destination data when available."
            />
          </div>
        )}
      </motion.div>
    </section>
  );
}

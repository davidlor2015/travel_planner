import { motion, useReducedMotion } from "framer-motion";
import { EmptyState, SectionHeading } from "../../../shared/ui";
import { TestimonialCard } from "../components/TestimonialCard";
import type { LandingTestimonial } from "../landing.types";

export function LandingTestimonialsSection({
  testimonials,
}: {
  testimonials: LandingTestimonial[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-4 py-18 sm:px-6 sm:py-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-6xl"
      >
        <SectionHeading
          eyebrow="Traveler notes"
          title="Less app switching. More trip feeling."
          align="center"
          description={
            <p>
              Quotes from the kind of shared trips Waypoint is built for:
              friends, families, and small groups making one plan together.
            </p>
          }
        />

        {testimonials.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} quote={testimonial} />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="Traveler notes will appear here"
              description="This section is reserved for verified traveler feedback when available."
            />
          </div>
        )}
      </motion.div>
    </section>
  );
}

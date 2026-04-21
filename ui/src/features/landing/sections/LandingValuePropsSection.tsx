import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "../../../shared/ui";
import type { LandingStep } from "../landing.types";

export function LandingValuePropsSection({ steps }: { steps: LandingStep[] }) {
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
          eyebrow="One shared trip home"
          title="The plan, the people, and the practical details stay together."
          align="center"
          description={
            <p>
              Create the trip, invite your people, generate a day-by-day
              itinerary, then keep the useful pieces close: reservations,
              packing, budget, notes, and map.
            </p>
          }
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-smoke bg-parchment p-5 text-center"
            >
              <h3 className="text-xl font-semibold text-espresso">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-flint">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

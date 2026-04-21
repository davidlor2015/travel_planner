import { motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "../../../shared/ui";
import { FeatureCard } from "../components/FeatureCard";
import type { LandingFeature } from "../landing.types";

export function LandingFeatureGrid({
  features,
}: {
  features: LandingFeature[];
}) {
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
          eyebrow="Trip tools"
          title="Built around what travelers actually need."
          align="center"
          description={
            <p>
              No generic control panels. Just the pieces that help a real group
              get from idea to departure.
            </p>
          }
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

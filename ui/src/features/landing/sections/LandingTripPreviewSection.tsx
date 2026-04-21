import { motion, useReducedMotion } from "framer-motion";
import { EmptyState, SectionHeading } from "../../../shared/ui";
import type { LandingDetail, LandingTripDay } from "../landing.types";

interface LandingTripPreviewSectionProps {
  tripDays: LandingTripDay[];
  sampleDetails: LandingDetail[];
}

export function LandingTripPreviewSection({
  tripDays,
  sampleDetails,
}: LandingTripPreviewSectionProps) {
  const reduceMotion = useReducedMotion();
  const hasPreview = tripDays.length > 0;

  return (
    <section id="sample-trip" className="px-4 py-18 sm:px-6 sm:py-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"
      >
        <SectionHeading
          eyebrow="Sample trip"
          title="A shared itinerary that feels like a trip, not a task board."
          description={
            <p>
              The itinerary view opens once trip-day content is available from
              your plan data. Until then, this section remains intentionally
              minimal.
            </p>
          }
        />

        {hasPreview ? (
          <div className="overflow-hidden rounded-[28px] border border-smoke bg-white shadow-[0_24px_60px_rgba(28,17,8,0.09)]">
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                {tripDays.map((day) => (
                  <article
                    key={day.day}
                    className="rounded-2xl border border-smoke bg-parchment p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber">
                      {day.day}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-espresso">
                      {day.title}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-flint">
                      {day.body}
                    </p>
                  </article>
                ))}
              </div>
              <aside className="space-y-3 rounded-2xl border border-smoke bg-white p-4">
                {sampleDetails.map((detail) => (
                  <div
                    key={detail.label}
                    className="border-b border-smoke pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {detail.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-espresso">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </aside>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Trip preview appears when plan data is available"
            description="Create a trip and generate an itinerary to populate this preview with real details."
          />
        )}
      </motion.div>
    </section>
  );
}

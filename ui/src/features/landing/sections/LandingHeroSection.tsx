import { motion, useReducedMotion } from "framer-motion";
import { ActionButton } from "../../../shared/ui";
import type { LandingContent } from "../landing.types";

interface LandingHeroSectionProps {
  content: LandingContent;
  onGetStarted: () => void;
}

export function LandingHeroSection({
  content,
  onGetStarted,
}: LandingHeroSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
      <img
        src={content.heroImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/38 to-black/68" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.28)_72%)]" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.16, duration: 0.8 }}
        className="relative mx-auto w-full max-w-6xl"
      >
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur">
            Travel plans, shared beautifully
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[0.98] text-white drop-shadow-sm min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
            Plan group trips without losing the plot.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/84">
            Waypoint brings your itinerary, invites, chat, bookings, budget,
            packing, and trip map into one calm shared space.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ActionButton
              onClick={onGetStarted}
              variant="primary"
              className="min-h-12 bg-amber hover:bg-amber-dark"
            >
              Start planning
            </ActionButton>
            <a
              href="#sample-trip"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/28 bg-white/12 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              View a sample trip
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

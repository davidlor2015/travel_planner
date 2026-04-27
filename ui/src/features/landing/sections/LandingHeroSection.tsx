// Path: ui/src/features/landing/sections/LandingHeroSection.tsx
// Summary: Implements LandingHeroSection module logic.

import { motion, useReducedMotion } from "framer-motion";

interface LandingHeroSectionProps {
  onGetStarted: () => void;
}

const MOCK_BLOCKERS = [
  "Hotel deposit still unconfirmed",
  "Travel insurance missing for Sam",
  "Day 1 arrival transport still open",
] as const;

const MOCK_CHANGES = [
  "Maya booked her flight",
  "Day 3 was updated",
  "Budget note added to Day 2",
] as const;

const HERO_PILLS = [
  { title: "Readiness", body: "see blockers before they become stressful" },
  { title: "Ownership", body: "know who is handling what" },
  { title: "On-trip mode", body: "stay useful once the trip starts" },
] as const;

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <path d="M8 5v3.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotIcon({ className }: { className?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
    />
  );
}

function HeroMock() {
  return (
    <div
      className="overflow-hidden rounded-[24px] border border-smoke bg-white shadow-[0_24px_72px_rgba(28,17,8,0.11)]"
      aria-hidden="true"
    >
      {/* Trip header */}
      <div className="border-b border-smoke bg-parchment/70 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Current trip
        </p>
        <p className="mt-0.5 font-display text-xl font-semibold text-espresso">
          Tokyo, Japan
        </p>
        <p className="mt-0.5 text-xs text-flint">
          Jun 14 – 21 · 4 travelers · 8 days out
        </p>
      </div>

      {/* Readiness */}
      <div className="border-b border-smoke px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Readiness
          </p>
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
            4 blockers
          </span>
        </div>
        <ul className="space-y-2.5">
          {MOCK_BLOCKERS.map((blocker) => (
            <li key={blocker} className="flex items-start gap-2 text-xs text-flint">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              {blocker}
            </li>
          ))}
        </ul>
      </div>

      {/* Next action */}
      <div className="border-b border-smoke px-5 py-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Next action
        </p>
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" />
          <div>
            <p className="text-sm font-semibold text-espresso">
              Confirm Shinjuku hotel deposit
            </p>
            <p className="mt-0.5 text-xs text-flint">
              Due in 3 days · currently handled by Kenji
            </p>
          </div>
        </div>
      </div>

      {/* Since last time */}
      <div className="px-5 py-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Since last time
        </p>
        <ul className="space-y-2">
          {MOCK_CHANGES.map((change) => (
            <li key={change} className="flex items-center gap-2 text-xs text-flint">
              <DotIcon className="h-1.5 w-1.5 shrink-0 rounded-full bg-flint/40" />
              {change}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LandingHeroSection({ onGetStarted }: LandingHeroSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section id="why-waypoint" className="bg-ivory px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.7 }}
          >
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber">
              <span className="h-px w-5 bg-amber" aria-hidden="true" />
              Operational trip planning
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.06] tracking-[-0.01em] text-espresso sm:text-5xl lg:text-[52px]">
              The trip feels calm
              <br />
              when everyone knows
              <br />
              what happens.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-flint">
              Waypoint is where the itinerary becomes usable. See what's
              happening, who owns what, and what to do next.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex min-h-[48px] items-center rounded-full bg-espresso px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-espresso-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
              >
                Start your trip
              </button>
              <a
                href="#product"
                className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full border border-smoke bg-white px-6 py-3 text-sm font-semibold text-flint transition-colors hover:border-espresso/20 hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
              >
                See product demo
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Feature pills */}
            <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:gap-8">
              {HERO_PILLS.map((pill) => (
                <div key={pill.title} className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-espresso">{pill.title}</p>
                  <p className="text-xs leading-relaxed text-flint">{pill.body}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: product mock */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.9, delay: 0.12 }}
          >
            <HeroMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

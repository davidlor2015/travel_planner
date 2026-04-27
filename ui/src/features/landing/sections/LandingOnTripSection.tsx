// Path: ui/src/features/landing/sections/LandingOnTripSection.tsx
// Summary: Implements LandingOnTripSection module logic.

import { motion, useReducedMotion } from "framer-motion";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 5v3.5l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M5.5 2.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
      <path d="M5 5l1.5 1.5-1 3.5H9M7.5 6.5L9 9.5l2.5 1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneMock() {
  return (
    <div
      className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[32px] border border-smoke/70 bg-white shadow-[0_32px_80px_rgba(28,17,8,0.14)]"
      aria-hidden="true"
    >
      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-smoke bg-parchment/80 px-5 py-2.5">
        <p className="text-[11px] font-semibold text-espresso">2:14 PM</p>
        <p className="text-[11px] font-medium text-flint">Day 3 of 8</p>
      </div>

      {/* Trip banner */}
      <div className="border-b border-smoke bg-espresso px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          On trip now
        </p>
        <p className="mt-0.5 font-display text-2xl font-semibold text-white">
          Tokyo
        </p>
      </div>

      {/* You're here */}
      <div className="border-b border-smoke px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          You're here
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-espresso">
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5 shrink-0 text-amber"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5C12.5 9.5 8 14 8 14S3.5 9.5 3.5 6A4.5 4.5 0 0 1 8 1.5Z" />
            <circle cx="8" cy="6" r="1.5" fill="white" />
          </svg>
          Shibuya Station
        </div>
      </div>

      {/* Next stop */}
      <div className="border-b border-smoke px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Next stop
        </p>
        <p className="mt-1.5 text-base font-semibold text-espresso">
          Shinjuku Gyoen
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-flint">
            <ClockIcon className="h-3 w-3" />
            3:00 PM
          </span>
          <span className="flex items-center gap-1 text-xs text-flint">
            <WalkIcon className="h-3 w-3" />
            45 min away
          </span>
        </div>
      </div>

      {/* Today summary */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Today
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-espresso">2 more stops</p>
          <p className="text-sm text-espresso">0 blockers</p>
          <p className="text-sm font-semibold text-olive">Group is on track</p>
        </div>
      </div>
    </div>
  );
}

export function LandingOnTripSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="on-trip" className="bg-ivory px-4 py-16 sm:px-6 sm:py-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2"
      >
        {/* Text */}
        <div className="max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
            On-trip mode
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-snug text-espresso sm:text-[36px]">
            When the trip starts,
            <br />
            the product gets quieter.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-flint">
            Day-of use should feel light. Open Waypoint and instantly see
            where you are, what's next, and whether anyone in the group
            has a problem — without searching through the full workspace.
          </p>
        </div>

        {/* Phone mock */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", bounce: 0.08, duration: 0.8, delay: 0.08 }}
        >
          <PhoneMock />
        </motion.div>
      </motion.div>
    </section>
  );
}

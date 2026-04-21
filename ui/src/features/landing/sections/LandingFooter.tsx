import { SiteFooterLinks, WaypointLogo } from "../../../shared/ui";

interface LandingFooterProps {
  onGetStarted: () => void;
}

export function LandingFooter({ onGetStarted }: LandingFooterProps) {
  return (
    <>
      {/* Final CTA */}
      <section className="bg-espresso px-4 py-20 text-center sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Start with your next trip
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-[40px] sm:leading-tight">
            Stop running the trip
            <br />
            from scattered notes.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/68">
            Build the itinerary, keep everyone aligned, and stay ready before
            departure — all in one shared space.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex min-h-[48px] items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-espresso transition-colors hover:bg-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Start free
            </button>
            <a
              href="#product"
              className="inline-flex min-h-[48px] items-center rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Watch demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-smoke bg-ivory px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <WaypointLogo variant="full" theme="light" className="select-none" />
            <p className="max-w-md text-xs leading-relaxed text-muted">
              AI suggestions can be incomplete. Confirm bookings, routes,
              opening hours, and prices before you spend money.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <SiteFooterLinks />
            <p className="text-xs text-muted">© 2026 Waypoint</p>
          </div>
        </div>
      </footer>
    </>
  );
}

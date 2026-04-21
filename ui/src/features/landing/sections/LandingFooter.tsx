import {
  ActionButton,
  SiteFooterLinks,
  WaypointLogo,
} from "../../../shared/ui";

interface LandingFooterProps {
  onGetStarted: () => void;
}

export function LandingFooter({ onGetStarted }: LandingFooterProps) {
  return (
    <>
      <section className="bg-espresso px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Start with the trip everyone keeps asking about.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/68">
            Create a shared travel home, generate the first itinerary, and keep
            the details ready for the people coming with you.
          </p>
          <ActionButton
            onClick={onGetStarted}
            className="mt-7 bg-ivory text-espresso hover:bg-parchment"
          >
            Start planning
          </ActionButton>
        </div>
      </section>

      <footer className="border-t border-smoke bg-ivory px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <WaypointLogo
              variant="full"
              theme="light"
              className="select-none"
            />
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted">
              AI suggestions can be incomplete. Confirm bookings, routes,
              opening hours, and prices before you spend money.
            </p>
          </div>
          <SiteFooterLinks />
        </div>
      </footer>
    </>
  );
}

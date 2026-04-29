// Path: ui/src/features/static/TermsPage.tsx
// Summary: Implements TermsPage module logic.

import { StaticPageLayout } from './StaticPageLayout';

export const TermsPage = () => (
  <StaticPageLayout
    eyebrow="Terms"
    title="Terms of Use"
    intro="Waypoint is provided as a planning tool. The goal is to make trip planning easier, but the final responsibility for travel choices and purchases still belongs to the traveler."
  >
    <section>
      <h2 className="text-base font-semibold text-espresso">Use of the service</h2>
      <p className="mt-2">
        You may use Waypoint to create trips, manage planning details, and review itinerary suggestions. Keep your account credentials secure and use the service lawfully and respectfully.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">AI and data accuracy</h2>
      <p className="mt-2">
        The app may surface AI-generated suggestions and third-party travel data. Those results are provided for planning assistance only and are not guarantees of availability, safety, pricing, or suitability.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">Travel decisions and purchases</h2>
      <p className="mt-2">
        You are responsible for verifying visas, reservations, schedules, opening hours, cancellation terms, and any booking details before you commit to travel or spend money.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">Feature availability</h2>
      <p className="mt-2">
        Some features are intentionally limited while the product is being stabilized. We may adjust, pause, or refine those features when needed to protect reliability and user trust.
      </p>
    </section>
  </StaticPageLayout>
);

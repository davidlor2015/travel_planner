// Path: ui/src/features/static/PrivacyPage.tsx
// Summary: Implements PrivacyPage module logic.

import { StaticPageLayout } from './StaticPageLayout';

export const PrivacyPage = () => (
  <StaticPageLayout
    eyebrow="Privacy"
    title="Privacy Policy"
    intro="Waypoint is built to help you plan trips, not to collect more data than needed. This summary explains what we store, why we store it, and the choices you have."
  >
    <section>
      <h2 className="text-base font-semibold text-espresso">What we collect</h2>
      <p className="mt-2">
        We store the account details, trip information, itinerary drafts you choose to save, and planning data you create inside the app. We also collect limited operational telemetry, such as error reports and request metrics, to keep the service stable.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">How we use it</h2>
      <p className="mt-2">
        Your data is used to authenticate you, save your trips, generate itinerary suggestions, and improve reliability. We do not sell your personal data. If third-party travel or quality-of-life data is shown, it is used only to power the product experience.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">AI and third-party sources</h2>
      <p className="mt-2">
        Some itinerary suggestions are generated with AI or assembled from third-party travel data sources. Those suggestions can be incomplete or wrong, so please verify bookings, opening hours, transit details, and prices before you spend money.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">Support and questions</h2>
      <p className="mt-2">
        If you need help with an account or privacy concern, use the Help &amp; Support page linked throughout the app.
      </p>
    </section>
  </StaticPageLayout>
);

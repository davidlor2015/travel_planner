import { StaticPageLayout } from './StaticPageLayout';

export const SupportPage = () => (
  <StaticPageLayout
    eyebrow="Support"
    title="Help & Support"
    intro="If something feels unclear, we want to make the next step obvious. Start with the quick paths below."
  >
    <section>
      <h2 className="text-base font-semibold text-espresso">Account help</h2>
      <p className="mt-2">
        Use the email verification and password reset flows from the sign-in area if you are locked out or still activating your account.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">Trip planning help</h2>
      <p className="mt-2">
        Shared trip details, reservations, and itineraries are visible to trip members. Personal budgets and packing lists stay private to each traveler.
      </p>
    </section>
    <section>
      <h2 className="text-base font-semibold text-espresso">Contact</h2>
      <p className="mt-2">
        For support requests, bug reports, or trust concerns, email <a className="font-semibold text-amber hover:underline" href="mailto:support@waypoint.local">support@waypoint.local</a>.
      </p>
      <p className="mt-2">
        If you are reporting an itinerary or travel-data issue, include the trip destination and the date range so it is easier to reproduce.
      </p>
    </section>
  </StaticPageLayout>
);

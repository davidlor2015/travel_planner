import { useNavigate } from "react-router-dom";
import {
  AppTopNav,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../shared/ui";
import { useLandingContent } from "./hooks/useLandingContent";
import {
  LandingFeatureGrid,
  LandingFooter,
  LandingHeroSection,
  LandingInspirationSection,
  LandingTestimonialsSection,
  LandingTripPreviewSection,
  LandingValuePropsSection,
} from "./sections";

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const navigate = useNavigate();
  const { data, loading, error } = useLandingContent();

  const links = [
    {
      id: "signin",
      label: "Sign in",
      onClick: onSignIn,
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory font-sans text-espresso">
      <AppTopNav
        links={links}
        onPrimaryAction={onGetStarted}
        primaryActionLabel="Start planning"
      />

      <main>
        {loading ? (
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-24" />
            <LoadingSkeleton className="h-52" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <ErrorState message={error} />
          </div>
        ) : data ? (
          <>
            <LandingHeroSection content={data} onGetStarted={onGetStarted} />
            <LandingValuePropsSection steps={data.steps} />
            <LandingFeatureGrid features={data.features} />
            <LandingTripPreviewSection
              tripDays={data.tripDays}
              sampleDetails={data.sampleDetails}
            />
            <LandingInspirationSection
              destinations={data.destinations}
              onGetStarted={onGetStarted}
            />
            <LandingTestimonialsSection testimonials={data.testimonials} />
            <LandingFooter onGetStarted={onGetStarted} />
          </>
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <EmptyState
              title="Travel inspiration is unavailable"
              description="Please refresh and try again."
              action={
                <button
                  type="button"
                  onClick={() => navigate(0)}
                  className="inline-flex min-h-11 items-center rounded-full border border-smoke bg-parchment px-4 py-2 text-sm font-semibold text-espresso"
                >
                  Reload
                </button>
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}

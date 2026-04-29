// Path: ui/src/features/landing/LandingPage.tsx
// Summary: Implements LandingPage module logic.

import { LandingNavBar } from "./LandingNavBar";
import {
  LandingCoreValuesSection,
  LandingFooter,
  LandingHeroSection,
  LandingOnTripSection,
} from "./sections";

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory font-sans text-espresso">
      <LandingNavBar onGetStarted={onGetStarted} onSignIn={onSignIn} />

      <main>
        <LandingHeroSection onGetStarted={onGetStarted} />
        <LandingCoreValuesSection />
        <LandingOnTripSection />
        <LandingFooter onGetStarted={onGetStarted} />
      </main>
    </div>
  );
}

// Path: ui/src/features/landing/LandingNavBar.tsx
// Summary: Implements LandingNavBar module logic.

import { RoenLogo } from "../../shared/ui";

interface LandingNavBarProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function LandingNavBar({ onGetStarted, onSignIn }: LandingNavBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-smoke bg-ivory/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <RoenLogo variant="full" theme="light" className="select-none" />
          <nav
            className="hidden items-center gap-6 sm:flex"
            aria-label="Page navigation"
          >
            <a
              href="#product"
              className="text-sm font-medium text-flint transition-colors hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35 rounded"
            >
              Product
            </a>
            <a
              href="#on-trip"
              className="text-sm font-medium text-flint transition-colors hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35 rounded"
            >
              Demo
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="hidden text-sm font-semibold text-flint transition-colors hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35 rounded px-1 sm:block"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex min-h-[44px] items-center rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-espresso-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
          >
            Start free
          </button>
        </div>
      </div>
    </header>
  );
}

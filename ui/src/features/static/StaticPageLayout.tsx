// Path: ui/src/features/static/StaticPageLayout.tsx
// Summary: Implements StaticPageLayout module logic.

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { SiteFooterLinks, WaypointLogo } from '../../shared/ui';

interface StaticPageLayoutProps {
  title: string;
  eyebrow?: string;
  intro: string;
  children: ReactNode;
}

export const StaticPageLayout = ({ title, eyebrow, intro, children }: StaticPageLayoutProps) => (
  <div className="min-h-screen flex flex-col bg-ivory font-sans">
    <header className="border-b border-smoke bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <Link to="/" className="inline-flex items-center">
          <WaypointLogo variant="header" className="select-none" />
        </Link>
        <SiteFooterLinks className="hidden items-center gap-4 sm:flex" />
      </div>
    </header>

    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
      <div className="rounded-[28px] border border-smoke/70 bg-white p-7 shadow-sm sm:p-10">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl font-semibold text-espresso sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-flint">{intro}</p>
        <div className="mt-7 space-y-6 text-sm leading-7 text-flint">
          {children}
        </div>
      </div>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm font-semibold text-amber hover:underline">
          Back to home
        </Link>
        <SiteFooterLinks />
      </footer>
    </main>
  </div>
);

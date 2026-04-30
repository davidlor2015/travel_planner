// Path: ui/src/app/AppShell/AppShell.tsx
// Summary: Implements AppShell module logic.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { SiteFooterLinks, RoenLogo } from "../../shared/ui";

// ── Types ────────────────────────────────────────────────────────────────────

export type AppView =
  | "trips"
  | "explore"
  | "archive"
  | "matching"
  | "profile";

interface NavTab {
  id: AppView;
  label: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  view: AppView;
  onViewChange: (v: AppView, tripId?: number) => void;
  userEmail: string;
  pendingInviteCount: number;
  onOpenInvites: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const TripsIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-4 h-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
      clipRule="evenodd"
    />
  </svg>
);

const ExploreIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-4 h-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
      clipRule="evenodd"
    />
  </svg>
);

const ArchiveIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-4 h-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M4 3a2 2 0 00-2 2v10.5A1.5 1.5 0 003.5 17H16a2 2 0 002-2V7a2 2 0 00-2-2h-5.2L9.6 3.8A2 2 0 008.2 3H4z" />
  </svg>
);

const ProfileIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-4 h-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
      clipRule="evenodd"
    />
  </svg>
);

const InviteIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="h-4 w-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M2.94 6.34A2 2 0 014.64 5h10.72a2 2 0 011.7 1.34L10 10.42 2.94 6.34z" />
    <path d="M2.5 7.86V14a2 2 0 002 2h11a2 2 0 002-2V7.86l-7 4.05a1 1 0 01-1 0l-7-4.05z" />
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_TABS: NavTab[] = [
  { id: "trips", label: "Trips", icon: <TripsIcon /> },
  { id: "archive", label: "Memories", icon: <ArchiveIcon /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const AppShell = ({
  view,
  onViewChange,
  userEmail,
  pendingInviteCount,
  onOpenInvites,
  onLogout,
  children,
}: AppShellProps) => {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [avatarMenuOpen]);

  const initial = userEmail[0]?.toUpperCase() ?? "W";
  const isTrips = view === "trips";
  const exploreEnabled = import.meta.env.VITE_ENABLE_EXPLORE === "true";
  const shellWidth = "max-w-6xl";

  return (
    <div
      className={`flex min-h-screen flex-col font-sans ${isTrips ? "bg-parchment-soft text-text" : "bg-bg-app"}`}
    >
      {/* ── Top Navbar ──
          Warmed from pure white to ivory so it reads as quiet chrome within the
          same editorial palette, while staying clearly lighter than the cream
          On-Trip container and the espresso "Happening now" focal card. */}
      <header
        className={`sticky top-0 z-50 hidden border-b backdrop-blur-md sm:block ${
          isTrips
            ? "border-border-ontrip bg-ivory/92"
            : "border-smoke bg-white/95"
        }`}
      >
        <div
          className={`${isTrips ? "max-w-7xl" : shellWidth} mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6`}
        >
          {/* Logo */}
          <RoenLogo
            variant="header"
            className="flex-shrink-0 select-none"
          />

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 rounded-full bg-parchment p-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                aria-current={view === tab.id ? "page" : undefined}
                className="relative rounded-full px-2.5 py-1.5 text-sm font-semibold transition-colors duration-150 cursor-pointer sm:px-4"
              >
                {view === tab.id && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-espresso shadow-sm"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${
                    view === tab.id
                      ? "text-white"
                      : "text-flint hover:text-espresso"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>

          {/* Right: Help + Avatar menu */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <Link
              to="/support"
              className="hidden text-sm font-medium text-flint transition-colors duration-200 hover:text-espresso sm:inline"
            >
              Help
            </Link>
            <button
              type="button"
              onClick={onOpenInvites}
              className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-app text-text-muted transition-colors hover:bg-surface-sunken hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 sm:flex"
              aria-label={
                pendingInviteCount > 0
                  ? `${pendingInviteCount} pending trip invite${pendingInviteCount === 1 ? "" : "s"}`
                  : "Open trip invites"
              }
            >
              <InviteIcon />
              {pendingInviteCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                  {pendingInviteCount}
                </span>
              ) : null}
            </button>
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-espresso text-[13px] font-semibold text-white transition-colors hover:bg-espresso-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                aria-label="Open user menu"
                title={userEmail}
              >
                {initial}
              </button>
              <AnimatePresence>
                {avatarMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-bg-app shadow-[0_8px_30px_rgba(28,17,8,0.1)]"
                  >
                    <div className="px-3 py-2.5">
                      <p className="truncate text-[11px] text-text-soft">{userEmail}</p>
                    </div>
                    <div className="border-t border-border">
                      {exploreEnabled ? (
                        <button
                          type="button"
                          onClick={() => { onViewChange("explore"); setAvatarMenuOpen(false); }}
                          className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-sunken"
                        >
                          <ExploreIcon />
                          Explore
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => { onViewChange("profile"); setAvatarMenuOpen(false); }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-sunken"
                      >
                        <ProfileIcon />
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => { onOpenInvites(); setAvatarMenuOpen(false); }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-sunken"
                      >
                        <InviteIcon />
                        <span className="flex-1 text-left">Invites</span>
                        {pendingInviteCount > 0 ? (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                            {pendingInviteCount}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => { onLogout(); setAvatarMenuOpen(false); }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-sunken"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      {isTrips ? (
        <div className="flex-1">{children}</div>
      ) : (
        <main
          className={`${shellWidth} mx-auto w-full flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8`}
        >
          {children}
        </main>
      )}

      {!isTrips && (
        <footer className="hidden border-t border-smoke bg-white/70 sm:block">
          <div
            className={`${shellWidth} mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6`}
          >
            <p className="text-xs text-muted">
              Verify AI suggestions, bookings, and schedules before you spend
              money.
            </p>
            <SiteFooterLinks />
          </div>
        </footer>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-app/98 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 backdrop-blur-md sm:hidden"
      >
        <div
          className="mx-auto grid max-w-md gap-1"
          style={{ gridTemplateColumns: `repeat(${NAV_TABS.length + 1}, minmax(0, 1fr))` }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[9px] font-semibold uppercase tracking-[0.04em] transition-colors min-[380px]:text-[10px] min-[380px]:tracking-[0.08em] ${
                  isActive ? "bg-surface-sunken" : "hover:bg-surface-muted"
                }`}
              >
                <span className={isActive ? "text-amber" : "text-muted"}>
                  {tab.icon}
                </span>
                <span className={isActive ? "text-amber" : "text-muted"}>
                  {tab.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onOpenInvites}
            className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[9px] font-semibold uppercase tracking-[0.04em] transition-colors hover:bg-surface-muted min-[380px]:text-[10px] min-[380px]:tracking-[0.08em]"
            aria-label={
              pendingInviteCount > 0
                ? `${pendingInviteCount} pending trip invite${pendingInviteCount === 1 ? "" : "s"}`
                : "Open trip invites"
            }
          >
            <span className="text-muted">
              <InviteIcon />
            </span>
            <span className="text-muted">Invites</span>
            {pendingInviteCount > 0 ? (
              <span className="absolute right-3 top-2 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                {pendingInviteCount}
              </span>
            ) : null}
          </button>
        </div>
      </nav>
    </div>
  );
};

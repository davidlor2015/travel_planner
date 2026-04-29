// Path: ui/src/features/trips/workspace/TripHero.tsx
// Summary: Implements TripHero module logic.

import { useMemo } from "react";
import { motion } from "framer-motion";

import type { Trip } from "../../../shared/api/trips";
import {
  getDestinationLabel,
  getTripImageUrl,
  getTripTagline,
} from "./helpers/tripVisuals";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "./types";
import type { TripReadinessSnapshot } from "./models/tripOverviewViewModel";
import { MemberAvatarStack, TripHeroMetadataRow } from "./WorkspacePrimitives";
import { isCollaborationActive } from "./helpers/collaborationGate";

interface TripHeroProps {
  trip: Trip;
  packingSummary?: PackingSummary;
  budgetSummary?: BudgetSummary;
  reservationSummary?: ReservationSummary;
  durationDays: number;
  timelineLabel?: string;
  /**
   * Display-only: snapshot from `buildTripReadinessSnapshot` (or equivalent).
   * Never compute readiness inside the hero — keeps this component presentational.
   */
  readiness?: TripReadinessSnapshot | null;
  /** Mirrors whether summary fetches have settled; controls pulse line copy. */
  summariesLoaded?: boolean;
  activityUnreadCount?: number;
  isActivityMuted?: boolean;
  onManageGroup: () => void;
  onOpenActivityDrawer?: () => void;
  onShareTrip?: () => void;
}

function formatTripDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return (
      start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " – " +
      end.getDate()
    );
  }
  return (
    start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " – " +
    end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );
}

export function TripHero({
  trip,
  packingSummary,
  budgetSummary,
  reservationSummary,
  durationDays,
  readiness,
  summariesLoaded = true,
  activityUnreadCount = 0,
  onManageGroup,
  onOpenActivityDrawer,
  onShareTrip,
}: TripHeroProps) {
  const imageUrl = useMemo(() => getTripImageUrl(trip), [trip]);
  const tagline = useMemo(() => getTripTagline(trip), [trip]);

  const daysAway = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(trip.end_date);
    end.setHours(0, 0, 0, 0);
    if (today > end) return null;
    if (today >= start) return 0;
    return Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [trip.start_date, trip.end_date]);

  const countdownLabel =
    daysAway === 0 ? "In Progress" :
    daysAway === 1 ? "Tomorrow" :
    daysAway !== null ? `${daysAway} days away` :
    null;

  const budgetPct =
    budgetSummary?.limit && budgetSummary.limit > 0
      ? Math.round((budgetSummary.totalSpent / budgetSummary.limit) * 100)
      : null;

  const confirmedBookings = reservationSummary?.upcoming ?? 0;
  const totalBookings = reservationSummary?.total ?? 0;

  const stats = [
    { label: `${durationDays}d`, sub: "Duration" },
    { label: totalBookings > 0 ? `${confirmedBookings}/${totalBookings}` : "—", sub: "Bookings" },
    { label: budgetPct !== null ? `${budgetPct}%` : "—", sub: "Budget" },
    {
      label: packingSummary && packingSummary.total > 0 ? `${packingSummary.progressPct}%` : "—",
      sub: "Packed",
    },
  ];
  const metadata = [
    {
      label: "Destination",
      value: trip.destination,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 18s5-4.4 5-9A5 5 0 0 0 5 9c0 4.6 5 9 5 9Z" />
          <circle cx="10" cy="9" r="1.7" />
        </svg>
      ),
    },
    {
      label: "Dates",
      value: formatTripDateRange(trip.start_date, trip.end_date),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M7 2.5v3M13 2.5v3M3 8h14" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ minHeight: "300px", border: "1px solid #DDD5C8" }}
    >
      {/* Background image */}
      <img
        src={imageUrl}
        alt={getDestinationLabel(trip.destination)}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(18,10,4,0.85) 0%, rgba(18,10,4,0.5) 50%, rgba(18,10,4,0.1) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(12,6,2,0.4) 0%, transparent 40%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 sm:p-8">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            {countdownLabel !== null && (
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-sm">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      daysAway === 0 ? "bg-[#4ADE80]" : "bg-[#FCD34D]"
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-white/85">
                    {countdownLabel}
                  </span>
                </div>
              </div>
            )}
            <h1
              className="font-display leading-[1.15] tracking-[-0.01em] text-[#FEFCF9]"
              style={{ fontSize: "34px", fontWeight: 600 }}
            >
              {trip.title}
            </h1>
            <p
              className="font-display italic text-white/55"
              style={{ fontSize: "14px", marginTop: "2px" }}
            >
              {tagline}
            </p>
            <p className="mt-2 max-w-xl text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
              {!summariesLoaded ? (
                <>Loading group signals…</>
              ) : readiness?.score != null && readiness.scoreLabel ? (
                <>
                  Group pulse · {readiness.score} · {readiness.scoreLabel} ·
                  itinerary + logistics
                </>
              ) : (
                <>Live trip workspace · itinerary + logistics + group</>
              )}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {onOpenActivityDrawer ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenActivityDrawer}
                aria-label={
                  activityUnreadCount > 0
                    ? `${activityUnreadCount} unread trip updates`
                    : "Open trip updates"
                }
                className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl backdrop-blur-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                {activityUnreadCount > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#B86845]"
                    style={{ border: "2px solid rgba(18,10,4,0.6)" }}
                  />
                ) : null}
              </motion.button>
            ) : null}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShareTrip}
              disabled={!onShareTrip}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path d="M16 6 12 2 8 6" />
                <path d="M12 2v13" />
              </svg>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onManageGroup}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2"
              style={{
                backgroundColor: "#B86845",
                color: "#FEFCF9",
                fontSize: "12.5px",
                fontWeight: 600,
                boxShadow: "0 2px 10px rgba(184,104,69,0.35)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="3.5" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Invite
            </motion.button>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            {/* Destination + Date */}
            <TripHeroMetadataRow items={metadata} />
            {/* Stats strip */}
            <div
              className="flex flex-wrap items-center gap-6"
              style={{
                paddingTop: "10px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {stats.map((stat) => (
                <div key={stat.sub}>
                  <span
                    className="font-display font-semibold text-white"
                    style={{ fontSize: "18px", lineHeight: 1.2 }}
                  >
                    {stat.label}
                  </span>
                  <span
                    className="ml-1 text-white/40"
                    style={{ fontSize: "10px", letterSpacing: "0.03em" }}
                  >
                    {stat.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isCollaborationActive(trip) && (
            <div className="flex flex-shrink-0 items-center gap-2.5">
              <MemberAvatarStack members={trip.members} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

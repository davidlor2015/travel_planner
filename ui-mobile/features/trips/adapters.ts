// Path: ui-mobile/features/trips/adapters.ts
// Summary: Implements adapters module logic.

import { getTripImageUrl } from "./workspace/helpers/tripVisuals";
import type { TripListItem, TripResponse, TripSummary } from "./types";

export type TripCardReadiness = {
  label: "Ready" | "On track" | "Needs focus" | "Behind" | "Just created";
  hint?: string;
};

export type TripListItemViewModel = TripListItem & {
  statusLabel: string;
  readiness?: TripCardReadiness;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTripStatus(
  startDate: string,
  endDate: string,
): TripListItem["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "active";
}

function statusLabel(status: TripListItem["status"]): string {
  if (status === "active") return "In Progress";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function scoreLabel(score: number): TripCardReadiness["label"] {
  if (score >= 90) return "Ready";
  if (score >= 70) return "On track";
  if (score >= 40) return "Needs focus";
  return "Behind";
}

/**
 * Lightweight, traveler-facing readiness + next-action chip built from the
 * same backend summary endpoints the web workspace uses. Mirrors the rules in
 * `ui/src/features/trips/workspace/models/tripOverviewViewModel.ts` but is
 * capped to the single most-actionable hint so a mobile card stays scannable.
 *
 * Returns `{ label: "Just created" }` when no summary is available yet, so a
 * fresh trip reads cleanly instead of looking broken.
 */
export function buildTripCardReadiness(
  status: TripListItem["status"],
  summary: TripSummary | undefined,
): TripCardReadiness {
  if (!summary) {
    return { label: "Just created" };
  }

  const metrics: number[] = [];

  if (summary.packing_total > 0) {
    metrics.push(clampPct(summary.packing_progress_pct));
  }

  if (summary.budget_limit != null && summary.budget_limit > 0) {
    const spendRatio = summary.budget_total_spent / summary.budget_limit;
    metrics.push(summary.budget_is_over ? 0 : clampPct((1 - spendRatio) * 100));
  }

  if (summary.reservation_count > 0) {
    metrics.push(
      clampPct(
        (summary.reservation_upcoming_count / summary.reservation_count) * 100,
      ),
    );
  }

  const label: TripCardReadiness["label"] =
    metrics.length === 0
      ? "Just created"
      : scoreLabel(
          Math.round(metrics.reduce((sum, part) => sum + part, 0) / metrics.length),
        );

  const hint = pickHint(status, summary);
  return hint ? { label, hint } : { label };
}

function pickHint(
  status: TripListItem["status"],
  summary: TripSummary,
): string | undefined {
  // Ordered by urgency so the single hint we surface is the most useful one.
  if (summary.budget_is_over) {
    return "Budget is over — review spend";
  }

  if (summary.prep_overdue_count > 0) {
    const n = summary.prep_overdue_count;
    return `${n} prep task${n === 1 ? "" : "s"} overdue`;
  }

  if (status !== "past" && summary.packing_total > 0) {
    const remaining = Math.max(
      0,
      summary.packing_total - summary.packing_checked,
    );
    if (remaining > 0) {
      return `${remaining} packing item${remaining === 1 ? "" : "s"} left`;
    }
  }

  if (status !== "past" && summary.reservation_upcoming_count > 0) {
    const n = summary.reservation_upcoming_count;
    return `${n} upcoming booking${n === 1 ? "" : "s"}`;
  }

  if (status === "upcoming" && summary.packing_total === 0) {
    return "Start a packing list";
  }

  if (status === "upcoming" && summary.reservation_count === 0) {
    return "Add your reservations";
  }

  return undefined;
}

// ─── Compact date helpers ────────────────────────────────────────────────────

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

function formatCompactDate(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCompactDateRange(start: string, end: string): string {
  return `${formatCompactDate(start)} – ${formatCompactDate(end)}`;
}

// ─── Readiness percentage ─────────────────────────────────────────────────────

export function buildReadinessPct(summary: TripSummary | undefined): number {
  if (!summary) return 0;
  const metrics: number[] = [];
  if (summary.packing_total > 0) {
    metrics.push(clampPct(summary.packing_progress_pct));
  }
  if (summary.budget_limit != null && summary.budget_limit > 0) {
    const spendRatio = summary.budget_total_spent / summary.budget_limit;
    metrics.push(summary.budget_is_over ? 0 : clampPct((1 - spendRatio) * 100));
  }
  if (summary.reservation_count > 0) {
    metrics.push(
      clampPct((summary.reservation_upcoming_count / summary.reservation_count) * 100),
    );
  }
  if (metrics.length === 0) return 0;
  return Math.round(metrics.reduce((sum, p) => sum + p, 0) / metrics.length);
}

// ─── List-page view models ───────────────────────────────────────────────────

export interface ActiveTripViewModel {
  id: number;
  title: string;
  country: string;
  dateRange: string;
  imageUrl: string;
  canOpenOnTrip: boolean;
  dayNumber: number;
  totalDays: number;
  memberCount: number;
  memberInitials: string[];
}

export interface UpcomingTripViewModel {
  id: number;
  title: string;
  dateRange: string;
  imageUrl: string;
  statusPill: "Planning" | "Confirmed";
  readinessPct: number;
  memberCount: number;
}

function extractCountry(destination: string): string {
  const parts = destination.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[1] ?? parts[0] ?? destination;
}

function computeDayProgress(
  startDate: string,
  endDate: string,
): { dayNumber: number; totalDays: number } {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy!, (sm ?? 1) - 1, sd ?? 1);
  const end = new Date(ey!, (em ?? 1) - 1, ed ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const dayNumber = Math.min(
    totalDays,
    Math.max(1, Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1),
  );
  return { dayNumber, totalDays };
}

function emailInitial(email: string): string {
  return (email[0] ?? "?").toUpperCase();
}

export function toActiveTripViewModel(
  trip: TripResponse,
  canOpenOnTrip: boolean,
): ActiveTripViewModel {
  const { dayNumber, totalDays } = computeDayProgress(trip.start_date, trip.end_date);
  const memberInitials = trip.members
    .filter((m) => m.status === "accepted" || m.role === "owner")
    .slice(0, 3)
    .map((m) => emailInitial(m.email));
  return {
    id: trip.id,
    title: trip.title,
    country: extractCountry(trip.destination),
    dateRange: formatCompactDateRange(trip.start_date, trip.end_date),
    imageUrl: getTripImageUrl({ id: trip.id, destination: trip.destination }),
    canOpenOnTrip,
    dayNumber,
    totalDays,
    memberCount: trip.member_count,
    memberInitials,
  };
}

export function toUpcomingTripViewModel(
  trip: TripResponse,
  summary: TripSummary | undefined,
): UpcomingTripViewModel {
  const pct = buildReadinessPct(summary);
  return {
    id: trip.id,
    title: trip.title,
    dateRange: formatCompactDateRange(trip.start_date, trip.end_date),
    imageUrl: getTripImageUrl({ id: trip.id, destination: trip.destination }),
    statusPill: pct >= 70 ? "Confirmed" : "Planning",
    readinessPct: pct,
    memberCount: trip.member_count,
  };
}

export function toTripListItem(
  trip: TripResponse,
  summary?: TripSummary,
): TripListItemViewModel {
  const status = getTripStatus(trip.start_date, trip.end_date);
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dateRange: `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`,
    memberCount: trip.member_count,
    status,
    statusLabel: statusLabel(status),
    readiness: buildTripCardReadiness(status, summary),
  };
}

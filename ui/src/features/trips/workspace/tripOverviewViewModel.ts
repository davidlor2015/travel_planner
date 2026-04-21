import type { Trip } from "../../../shared/api/trips";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "./types";

export type AttentionSeverity = "blocker" | "watch" | "nudge";

export type AttentionTargetTab = "bookings" | "budget" | "packing" | "members";

export interface TripAttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail?: string;
  actionLabel: string;
  targetTab: AttentionTargetTab;
}

export interface TripReadinessSnapshot {
  /** 0–100 when enough backend fields exist; null when readiness cannot be scored. */
  score: number | null;
  /** Short label for hero or compact UI; null if no score. */
  scoreLabel: string | null;
}

function daysUntilStart(startIso: string): number | null {
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilEnd(endIso: string): number | null {
  const end = new Date(endIso);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  blocker: 0,
  watch: 1,
  nudge: 2,
};

/**
 * Derives actionable attention items from real trip + summary payloads only.
 * No placeholder trip content — empty array means nothing surfaced by these rules.
 */
export function buildTripAttentionItems(
  trip: Trip,
  packing: PackingSummary,
  budget: BudgetSummary,
  reservations: ReservationSummary,
  summariesLoaded: boolean,
): TripAttentionItem[] {
  const items: TripAttentionItem[] = [];
  const untilStart = daysUntilStart(trip.start_date);
  const untilEnd = daysUntilEnd(trip.end_date);
  const tripNotEnded = untilEnd === null || untilEnd >= 0;

  if (!summariesLoaded) {
    if (trip.pending_invites.length > 0) {
      items.push({
        id: "invites-pending",
        severity: "nudge",
        title: "Invites outstanding",
        detail: `${trip.pending_invites.length} invite(s) not accepted yet.`,
        actionLabel: "Members",
        targetTab: "members",
      });
    }
    if (trip.members.length === 1 && tripNotEnded) {
      items.push({
        id: "solo-group",
        severity: "nudge",
        title: "Solo on the trip workspace",
        detail: "Invite others so coordination and chat unlock for the group.",
        actionLabel: "Invite",
        targetTab: "members",
      });
    }
    return items.slice(0, 4);
  }

  if (budget.limit != null && budget.limit > 0 && budget.isOverBudget) {
    items.push({
      id: "budget-over",
      severity: "blocker",
      title: "Over budget",
      detail: "Spending has crossed the limit the group set.",
      actionLabel: "Review budget",
      targetTab: "budget",
    });
  }

  if (
    budget.limit != null &&
    budget.limit > 0 &&
    !budget.isOverBudget &&
    budget.remaining != null &&
    budget.expenseCount > 0
  ) {
    const tight =
      budget.remaining >= 0 && budget.remaining <= budget.limit * 0.12;
    if (tight) {
      items.push({
        id: "budget-tight",
        severity: "watch",
        title: "Budget is tight",
        detail: "Little headroom left before the limit.",
        actionLabel: "Adjust or track",
        targetTab: "budget",
      });
    }
  }

  if (
    tripNotEnded &&
    packing.total > 0 &&
    packing.progressPct < 45 &&
    untilStart !== null &&
    untilStart <= 10 &&
    untilStart >= 0
  ) {
    items.push({
      id: "packing-behind",
      severity: "watch",
      title: "Packing still open",
      detail: `${packing.checked}/${packing.total} items checked with the trip approaching.`,
      actionLabel: "Packing list",
      targetTab: "packing",
    });
  }

  if (
    tripNotEnded &&
    reservations.total === 0 &&
    untilStart !== null &&
    untilStart <= 21 &&
    untilStart >= 0
  ) {
    items.push({
      id: "bookings-none",
      severity: "watch",
      title: "No bookings on file",
      detail: "Log stays and transport so the group shares one source of truth.",
      actionLabel: "Add bookings",
      targetTab: "bookings",
    });
  }

  if (
    tripNotEnded &&
    reservations.total > 0 &&
    reservations.upcoming === 0 &&
    untilStart !== null &&
    untilStart <= 14 &&
    untilStart >= 0
  ) {
    items.push({
      id: "bookings-no-upcoming",
      severity: "nudge",
      title: "No upcoming reservations",
      detail: "Everything logged looks in the past — confirm what is still active.",
      actionLabel: "Bookings",
      targetTab: "bookings",
    });
  }

  if (trip.pending_invites.length > 0) {
    items.push({
      id: "invites-pending",
      severity: "nudge",
      title: "Invites outstanding",
      detail: `${trip.pending_invites.length} invite(s) not accepted yet.`,
      actionLabel: "Members",
      targetTab: "members",
    });
  }

  if (trip.members.length === 1 && tripNotEnded) {
    items.push({
      id: "solo-group",
      severity: "nudge",
      title: "Solo on the trip workspace",
      detail: "Invite others so coordination and chat unlock for the group.",
      actionLabel: "Invite",
      targetTab: "members",
    });
  }

  items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return items.slice(0, 4);
}

/**
 * Lightweight readiness signal from backend summaries only.
 * Returns null score when too little is configured to mean anything.
 */
export function buildTripReadinessSnapshot(
  trip: Trip,
  packing: PackingSummary,
  budget: BudgetSummary,
  reservations: ReservationSummary,
  summariesLoaded: boolean,
): TripReadinessSnapshot {
  if (!summariesLoaded) {
    return { score: null, scoreLabel: null };
  }

  const hasAnySignal =
    packing.total > 0 ||
    (budget.limit != null && budget.limit > 0) ||
    reservations.total > 0 ||
    trip.members.length > 1;

  if (!hasAnySignal) {
    return { score: null, scoreLabel: null };
  }

  const parts: number[] = [];

  if (packing.total > 0) {
    parts.push(Math.max(0, Math.min(100, packing.progressPct)));
  }

  if (budget.limit != null && budget.limit > 0) {
    const spendRatio = budget.totalSpent / budget.limit;
    const budgetHealth = budget.isOverBudget
      ? 0
      : Math.max(0, Math.min(100, (1 - spendRatio) * 100));
    parts.push(budgetHealth);
  }

  if (reservations.total > 0) {
    const bookingRatio = reservations.upcoming / reservations.total;
    parts.push(Math.round(bookingRatio * 100));
  }

  if (trip.members.length > 1) {
    parts.push(100);
  } else {
    parts.push(40);
  }

  const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  return {
    score,
    scoreLabel: score >= 75 ? "On track" : score >= 45 ? "Needs focus" : "Behind",
  };
}

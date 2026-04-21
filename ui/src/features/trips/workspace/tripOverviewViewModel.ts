import type { Trip } from "../../../shared/api/trips";
import type { Itinerary, ItineraryItem } from "../../../shared/api/ai";
import {
  extractStopOwnershipMetadata,
  normalizeStopStatus,
} from "../itineraryDraft";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "./types";

export type AttentionSeverity = "blocker" | "watch" | "nudge";

export type AttentionTargetTab =
  | "overview"
  | "bookings"
  | "budget"
  | "packing"
  | "members";

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

export interface ItineraryOpsSnapshot {
  hasItinerary: boolean;
  totalStops: number;
  plannedStops: number;
  confirmedStops: number;
  skippedStops: number;
  stopsWithHandledBy: number;
  stopsWithBookedBy: number;
  ownershipSignalsPresent: boolean;
  statusSignalsPresent: boolean;
  handlerCounts: Array<{ name: string; count: number }>;
}

function daysUntilStart(startIso: string): number | null {
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function daysUntilEnd(endIso: string): number | null {
  const end = new Date(endIso);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  blocker: 0,
  watch: 1,
  nudge: 2,
};

function sortCounts(
  counts: Map<string, number>,
): Array<{ name: string; count: number }> {
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function itineraryItems(itinerary: Itinerary | null): ItineraryItem[] {
  return itinerary?.days.flatMap((day) => day.items) ?? [];
}

export function buildItineraryOpsSnapshot(
  itinerary: Itinerary | null,
): ItineraryOpsSnapshot {
  const items = itineraryItems(itinerary);
  const handlerCounts = new Map<string, number>();
  let confirmedStops = 0;
  let skippedStops = 0;
  let stopsWithHandledBy = 0;
  let stopsWithBookedBy = 0;

  for (const item of items) {
    const status = normalizeStopStatus(item.status);
    if (status === "confirmed") confirmedStops += 1;
    if (status === "skipped") skippedStops += 1;

    const { metadata } = extractStopOwnershipMetadata(item.notes);
    if (metadata.handledBy) {
      stopsWithHandledBy += 1;
      handlerCounts.set(
        metadata.handledBy,
        (handlerCounts.get(metadata.handledBy) ?? 0) + 1,
      );
    }
    if (metadata.bookedBy) {
      stopsWithBookedBy += 1;
    }
  }

  return {
    hasItinerary: Boolean(itinerary),
    totalStops: items.length,
    plannedStops: Math.max(0, items.length - confirmedStops - skippedStops),
    confirmedStops,
    skippedStops,
    stopsWithHandledBy,
    stopsWithBookedBy,
    ownershipSignalsPresent: stopsWithHandledBy > 0 || stopsWithBookedBy > 0,
    statusSignalsPresent: confirmedStops > 0 || skippedStops > 0,
    handlerCounts: sortCounts(handlerCounts),
  };
}

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
  itinerary: Itinerary | null = null,
): TripAttentionItem[] {
  const items: TripAttentionItem[] = [];
  const untilStart = daysUntilStart(trip.start_date);
  const untilEnd = daysUntilEnd(trip.end_date);
  const tripNotEnded = untilEnd === null || untilEnd >= 0;
  const itineraryOps = buildItineraryOpsSnapshot(itinerary);
  const isGroupTrip =
    trip.members.length > 1 || trip.pending_invites.length > 0;

  if (!summariesLoaded) {
    if (tripNotEnded && !itineraryOps.hasItinerary) {
      items.push({
        id: "itinerary-missing",
        severity: "nudge",
        title: "No shared itinerary yet",
        detail: "Add a day or stop so the workspace has a plan to coordinate.",
        actionLabel: "Start itinerary",
        targetTab: "overview",
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
    return items.slice(0, 4);
  }

  if (tripNotEnded && !itineraryOps.hasItinerary) {
    items.push({
      id: "itinerary-missing",
      severity: "nudge",
      title: "No shared itinerary yet",
      detail: "Add a day or stop so the workspace has a plan to coordinate.",
      actionLabel: "Start itinerary",
      targetTab: "overview",
    });
  }

  if (
    tripNotEnded &&
    isGroupTrip &&
    itineraryOps.totalStops > 0 &&
    itineraryOps.ownershipSignalsPresent &&
    itineraryOps.stopsWithHandledBy < itineraryOps.totalStops
  ) {
    const openCount = itineraryOps.totalStops - itineraryOps.stopsWithHandledBy;
    items.push({
      id: "itinerary-ownership-open",
      severity: "nudge",
      title: "Some stops need a handler",
      detail: `${openCount} stop${openCount === 1 ? "" : "s"} do not have handled-by ownership yet.`,
      actionLabel: "Assign stops",
      targetTab: "overview",
    });
  }

  if (
    tripNotEnded &&
    itineraryOps.totalStops > 0 &&
    itineraryOps.statusSignalsPresent &&
    itineraryOps.plannedStops > 0 &&
    untilStart !== null &&
    untilStart <= 7 &&
    untilStart >= 0
  ) {
    items.push({
      id: "itinerary-status-open",
      severity: "nudge",
      title: "Some stops are still planned",
      detail: `${itineraryOps.plannedStops} stop${itineraryOps.plannedStops === 1 ? "" : "s"} have not been confirmed or skipped.`,
      actionLabel: "Review stops",
      targetTab: "overview",
    });
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
      severity: "nudge",
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
  itinerary: Itinerary | null = null,
): TripReadinessSnapshot {
  if (!summariesLoaded) {
    return { score: null, scoreLabel: null };
  }

  const itineraryOps = buildItineraryOpsSnapshot(itinerary);
  const hasAnySignal =
    itineraryOps.totalStops > 0 ||
    packing.total > 0 ||
    (budget.limit != null && budget.limit > 0) ||
    reservations.total > 0 ||
    trip.pending_invites.length > 0;

  if (!hasAnySignal) {
    return { score: null, scoreLabel: null };
  }

  const parts: number[] = [];

  if (itineraryOps.totalStops > 0) {
    const statusHealth = itineraryOps.statusSignalsPresent
      ? Math.round(
          ((itineraryOps.confirmedStops + itineraryOps.skippedStops) /
            itineraryOps.totalStops) *
            100,
        )
      : 100;
    parts.push(statusHealth);
  }

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

  if (trip.pending_invites.length > 0) {
    parts.push(75);
  }

  const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  return {
    score,
    scoreLabel:
      score >= 90
        ? "Ready"
        : score >= 75
          ? "On track"
          : score >= 45
            ? "Needs focus"
            : "Behind",
  };
}

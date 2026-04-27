// Path: ui/src/features/trips/workspace/models/tripOverviewViewModel.ts
// Summary: Defines the tripOverviewViewModel data model.

import type { Trip, TripMemberReadinessItem } from "../../../../shared/api/trips";
import type { DayAnchorType, Itinerary, ItineraryItem } from "../../../../shared/api/ai";
import {
  extractStopOwnershipMetadata,
  normalizeStopStatus,
} from "../../itinerary/itineraryDraft";
import { isCollaborationActive } from "../helpers/collaborationGate";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../types";

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
  /** Number of readiness signals scored from concrete workspace state. */
  knownSignalCount: number;
  /** Number of readiness signals currently unknown / not configured. */
  unknownSignalCount: number;
  /** Explicit unknown state for UI copy and conservative handling. */
  unknownState: "loading" | "no_signals" | "partial" | null;
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

interface ReadinessMetric {
  key: "itinerary" | "packing" | "budget" | "bookings";
  score: number | null;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

interface OwnershipActionSignals {
  actorOwnedPlannedCount: number;
  unassignedPlannedWhenOwnershipUsed: number;
}

interface WaitingOnSignals {
  topOtherBlockedEmail: string | null;
  topOtherBlockerCount: number;
}

const OPERATIONAL_ANCHOR_TYPES: ReadonlySet<DayAnchorType> = new Set([
  "flight",
  "hotel_checkin",
]);

function isOperationalAnchorType(type: string | null | undefined): type is DayAnchorType {
  if (type !== "flight" && type !== "hotel_checkin") return false;
  return OPERATIONAL_ANCHOR_TYPES.has(type);
}

function normalizeEmailLike(value: string | null | undefined): string | null {
  const next = value?.trim().toLowerCase() ?? "";
  return next.length > 0 ? next : null;
}

function labelFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

function deriveOwnershipActionSignals(
  itinerary: Itinerary | null,
  actorEmail: string | null,
): OwnershipActionSignals {
  const normalizedActor = normalizeEmailLike(actorEmail);
  let ownershipUsed = false;
  let actorOwnedPlannedCount = 0;
  let unassignedPlannedItems = 0;
  let unassignedOperationalAnchors = 0;

  const items = itineraryItems(itinerary);
  for (const item of items) {
    const status = normalizeStopStatus(item.status);
    if (status !== "planned") continue;
    const { metadata } = extractStopOwnershipMetadata(item.notes, {
      handledBy: item.handled_by ?? null,
      bookedBy: item.booked_by ?? null,
    });
    const handledBy = normalizeEmailLike(metadata.handledBy);

    if (handledBy) {
      ownershipUsed = true;
      if (normalizedActor && handledBy === normalizedActor) {
        actorOwnedPlannedCount += 1;
      }
      continue;
    }
    unassignedPlannedItems += 1;
  }

  const anchors = itineraryAnchors(itinerary).filter((anchor) =>
    isOperationalAnchorType(anchor.type),
  );
  for (const anchor of anchors) {
    const handledBy = normalizeEmailLike(anchor.handled_by);
    if (handledBy) {
      ownershipUsed = true;
      if (normalizedActor && handledBy === normalizedActor) {
        actorOwnedPlannedCount += 1;
      }
      continue;
    }
    unassignedOperationalAnchors += 1;
  }

  return {
    actorOwnedPlannedCount,
    unassignedPlannedWhenOwnershipUsed: ownershipUsed
      ? unassignedPlannedItems + unassignedOperationalAnchors
      : 0,
  };
}

function deriveWaitingOnSignals(
  memberReadiness: TripMemberReadinessItem[] | null,
  actorEmail: string | null,
): WaitingOnSignals {
  if (!memberReadiness || memberReadiness.length === 0) {
    return {
      topOtherBlockedEmail: null,
      topOtherBlockerCount: 0,
    };
  }

  const normalizedActor = normalizeEmailLike(actorEmail);
  let topOtherBlockedEmail: string | null = null;
  let topOtherBlockerCount = 0;

  for (const member of memberReadiness) {
    const memberEmail = normalizeEmailLike(member.email);
    if (!memberEmail) continue;
    if (normalizedActor && memberEmail === normalizedActor) continue;
    if (member.blocker_count <= 0) continue;
    if (member.blocker_count > topOtherBlockerCount) {
      topOtherBlockedEmail = memberEmail;
      topOtherBlockerCount = member.blocker_count;
    }
  }

  return {
    topOtherBlockedEmail,
    topOtherBlockerCount,
  };
}

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

function itineraryAnchors(itinerary: Itinerary | null): Array<{
  type?: string | null;
  handled_by?: string | null;
  booked_by?: string | null;
}> {
  return itinerary?.days.flatMap((day) => day.anchors ?? []) ?? [];
}

export function buildItineraryOpsSnapshot(
  itinerary: Itinerary | null,
): ItineraryOpsSnapshot {
  const items = itineraryItems(itinerary);
  const anchors = itineraryAnchors(itinerary);
  const handlerCounts = new Map<string, number>();
  let confirmedStops = 0;
  let skippedStops = 0;
  let stopsWithHandledBy = 0;
  let stopsWithBookedBy = 0;

  for (const item of items) {
    const status = normalizeStopStatus(item.status);
    if (status === "confirmed") confirmedStops += 1;
    if (status === "skipped") skippedStops += 1;

    const { metadata } = extractStopOwnershipMetadata(item.notes, {
      handledBy: item.handled_by ?? null,
      bookedBy: item.booked_by ?? null,
    });
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

  for (const anchor of anchors) {
    if (!isOperationalAnchorType(anchor.type)) continue;
    const handledBy = anchor.handled_by?.trim() || null;
    const bookedBy = anchor.booked_by?.trim() || null;
    if (handledBy) {
      stopsWithHandledBy += 1;
      handlerCounts.set(
        handledBy,
        (handlerCounts.get(handledBy) ?? 0) + 1,
      );
    }
    if (bookedBy) {
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
  actorEmail: string | null = null,
  memberReadiness: TripMemberReadinessItem[] | null = null,
): TripAttentionItem[] {
  const items: TripAttentionItem[] = [];
  const untilStart = daysUntilStart(trip.start_date);
  const untilEnd = daysUntilEnd(trip.end_date);
  const tripNotEnded = untilEnd === null || untilEnd >= 0;
  const itineraryOps = buildItineraryOpsSnapshot(itinerary);
  const isGroupTrip = isCollaborationActive(trip);
  const ownershipSignals = deriveOwnershipActionSignals(
    itinerary,
    actorEmail,
  );
  const waitingOnSignals = deriveWaitingOnSignals(memberReadiness, actorEmail);

  if (!summariesLoaded) {
    if (
      tripNotEnded &&
      untilStart !== null &&
      untilStart <= 30 &&
      untilStart >= 0
    ) {
      items.push({
        id: "readiness-unknown-loading",
        severity: "nudge",
        title: "Readiness still loading",
        detail: "Workspace summaries are still loading, so readiness is unknown.",
        actionLabel: "Open overview",
        targetTab: "overview",
      });
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

  const readiness = buildTripReadinessSnapshot(
    trip,
    packing,
    budget,
    reservations,
    summariesLoaded,
    itinerary,
  );
  if (
    tripNotEnded &&
    readiness.score === null &&
    readiness.unknownState === "no_signals" &&
    untilStart !== null &&
    untilStart <= 30 &&
    untilStart >= 0
  ) {
    items.push({
      id: "readiness-unknown-config",
      severity: "nudge",
      title: "Readiness is still unknown",
      detail:
        "Add itinerary status, packing, budget, or bookings to make readiness measurable.",
      actionLabel: "Open overview",
      targetTab: "overview",
    });
  }

  if (
    tripNotEnded &&
    ownershipSignals.actorOwnedPlannedCount > 0
  ) {
    items.push({
      id: "itinerary-owned-by-you-open",
      severity: "watch",
      title: "You have open trip stops",
      detail: `${ownershipSignals.actorOwnedPlannedCount} planned stop${ownershipSignals.actorOwnedPlannedCount === 1 ? "" : "s"} are assigned to you.`,
      actionLabel: "Review your stops",
      targetTab: "overview",
    });
  } else if (
    tripNotEnded &&
    isGroupTrip &&
    waitingOnSignals.topOtherBlockedEmail &&
    waitingOnSignals.topOtherBlockerCount > 0
  ) {
    const ownerLabel = labelFromEmail(waitingOnSignals.topOtherBlockedEmail);
    items.push({
      id: "itinerary-waiting-on-owner",
      severity: "nudge",
      title: `Waiting on ${ownerLabel}`,
      detail: `${waitingOnSignals.topOtherBlockerCount} blocker${waitingOnSignals.topOtherBlockerCount === 1 ? "" : "s"} are explicitly owned there.`,
      actionLabel: "Check ownership",
      targetTab: "overview",
    });
  }

  if (
    tripNotEnded &&
    isGroupTrip &&
    itineraryOps.ownershipSignalsPresent &&
    ownershipSignals.unassignedPlannedWhenOwnershipUsed > 0
  ) {
    items.push({
      id: "itinerary-ownership-open",
      severity: "nudge",
      title: "Some stops need a handler",
      detail: `${ownershipSignals.unassignedPlannedWhenOwnershipUsed} planned stop${ownershipSignals.unassignedPlannedWhenOwnershipUsed === 1 ? "" : "s"} do not have handled-by ownership yet.`,
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
  _trip: Trip,
  packing: PackingSummary,
  budget: BudgetSummary,
  reservations: ReservationSummary,
  summariesLoaded: boolean,
  itinerary: Itinerary | null = null,
): TripReadinessSnapshot {
  if (!summariesLoaded) {
    return {
      score: null,
      scoreLabel: null,
      knownSignalCount: 0,
      unknownSignalCount: 4,
      unknownState: "loading",
    };
  }

  const itineraryOps = buildItineraryOpsSnapshot(itinerary);
  const metrics: ReadinessMetric[] = [];

  if (itineraryOps.totalStops === 0 || !itineraryOps.statusSignalsPresent) {
    metrics.push({ key: "itinerary", score: null });
  } else {
    metrics.push({
      key: "itinerary",
      score: clampPct(
        ((itineraryOps.confirmedStops + itineraryOps.skippedStops) /
          itineraryOps.totalStops) *
          100,
      ),
    });
  }

  if (packing.total === 0) {
    metrics.push({ key: "packing", score: null });
  } else {
    metrics.push({ key: "packing", score: clampPct(packing.progressPct) });
  }

  if (budget.limit == null || budget.limit <= 0) {
    metrics.push({ key: "budget", score: null });
  } else {
    const spendRatio = budget.totalSpent / budget.limit;
    metrics.push({
      key: "budget",
      score: budget.isOverBudget ? 0 : clampPct((1 - spendRatio) * 100),
    });
  }

  if (reservations.total === 0) {
    metrics.push({ key: "bookings", score: null });
  } else {
    metrics.push({
      key: "bookings",
      score: clampPct((reservations.upcoming / reservations.total) * 100),
    });
  }

  const knownScores = metrics
    .map((metric) => metric.score)
    .filter((score): score is number => score != null);
  const knownSignalCount = knownScores.length;
  const unknownSignalCount = metrics.length - knownSignalCount;

  if (knownScores.length === 0) {
    return {
      score: null,
      scoreLabel: null,
      knownSignalCount,
      unknownSignalCount,
      unknownState: "no_signals",
    };
  }

  const score = Math.round(
    knownScores.reduce((total, part) => total + part, 0) / knownScores.length,
  );
  const unknownState = unknownSignalCount > 0 ? "partial" : null;
  return {
    score,
    scoreLabel:
      score >= 90
        ? "Ready"
        : score >= 70
          ? "On track"
          : score >= 40
            ? "Needs focus"
            : "Behind",
    knownSignalCount,
    unknownSignalCount,
    unknownState,
  };
}

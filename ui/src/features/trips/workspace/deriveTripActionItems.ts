import type { Trip } from "../../../shared/api/trips";
import type { Itinerary } from "../../../shared/api/ai";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "./types";
import type { WorkspaceTab } from "./WorkspaceTabBar";
import {
  buildTripAttentionItems,
  type AttentionSeverity,
} from "./tripOverviewViewModel";

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  blocker: 0,
  watch: 1,
  nudge: 2,
};

const INTENT_ORDER: Record<TripActionIntent, number> = {
  workspace_error: 0,
  draft_publish: 1,
  itinerary_setup: 2,
  first_day_timing: 3,
  ownership: 4,
  bookings: 5,
  budget: 6,
  packing: 7,
  readiness: 8,
  activity: 9,
};

/** Workspace-only signals (no UI, no handlers). */
export interface TripWorkspaceSignals {
  /** Non-itinerary mutations (e.g. delete trip). */
  tripActionError: string | null;
  /** Draft apply / refine / assist failures only. */
  draftActionError: string | null;
  streamError: string | null;
  hasPendingDraft: boolean;
  isApplyingItinerary: boolean;
  unreadActivityCount: number;
  activityMuted: boolean;
}

/** Full payload when a trip is selected (summaries + workspace signals). */
export interface TripActionInputs {
  trip: Trip;
  actorEmail: string;
  packing: PackingSummary;
  budget: BudgetSummary;
  reservations: ReservationSummary;
  summariesLoaded: boolean;
  itinerary: Itinerary | null;
  workspace: TripWorkspaceSignals;
}

/**
 * Pass `{ trip: null }` when there is no selection — returns [] without inventing rows.
 * Otherwise pass trip + summaries + workspace signals.
 */
export type TripActionDerivationInput = { trip: null } | TripActionInputs;

export type TripActionCommand =
  | { kind: "open_tab"; tab: WorkspaceTab }
  | { kind: "open_activity_drawer" }
  | { kind: "focus_draft_publish" }
  | { kind: "focus_itinerary_stream" };

export type TripActionReason =
  | "workspace_draft_error"
  | "workspace_trip_error"
  | "workspace_stream_error"
  | "draft_pending_publish"
  | "unread_activity"
  | "itinerary_missing"
  | "first_day_timing_missing"
  | "ownership_assigned_to_you"
  | "ownership_waiting_on_other"
  | "ownership_unassigned"
  | "itinerary_status_open"
  | "budget_over"
  | "budget_tight"
  | "packing_behind"
  | "bookings_missing"
  | "bookings_no_upcoming"
  | "invites_pending"
  | "readiness_unknown"
  | "generic_attention";

export type TripActionIntent =
  | "workspace_error"
  | "draft_publish"
  | "itinerary_setup"
  | "first_day_timing"
  | "ownership"
  | "bookings"
  | "budget"
  | "packing"
  | "readiness"
  | "activity";

export interface TripWorkspaceActionItem {
  id: string;
  reason: TripActionReason;
  intent: TripActionIntent;
  severity: AttentionSeverity;
  title: string;
  detail?: string;
  actionLabel: string;
  command: TripActionCommand;
}

export interface TripActionabilityModel {
  state: "blocked" | "actionable" | "steady";
  systemFailures: TripWorkspaceActionItem[];
  rankedOperationalActions: TripWorkspaceActionItem[];
  primaryAction: TripWorkspaceActionItem | null;
  secondaryActions: TripWorkspaceActionItem[];
}

const MAX_OPERATIONAL_ITEMS = 5;

function toAttentionReason(id: string): TripActionReason {
  if (id === "itinerary-missing") return "itinerary_missing";
  if (id === "itinerary-status-open") return "itinerary_status_open";
  if (id === "itinerary-owned-by-you-open") return "ownership_assigned_to_you";
  if (id === "itinerary-waiting-on-owner") return "ownership_waiting_on_other";
  if (id === "itinerary-ownership-open") return "ownership_unassigned";
  if (id === "budget-over") return "budget_over";
  if (id === "budget-tight") return "budget_tight";
  if (id === "packing-behind") return "packing_behind";
  if (id === "bookings-none") return "bookings_missing";
  if (id === "bookings-no-upcoming") return "bookings_no_upcoming";
  if (id === "invites-pending") return "invites_pending";
  if (id.startsWith("readiness-unknown")) return "readiness_unknown";
  return "generic_attention";
}

function intentForReason(reason: TripActionReason): TripActionIntent {
  if (
    reason === "workspace_draft_error" ||
    reason === "workspace_trip_error" ||
    reason === "workspace_stream_error"
  ) {
    return "workspace_error";
  }
  if (reason === "draft_pending_publish") return "draft_publish";
  if (reason === "itinerary_missing") return "itinerary_setup";
  if (reason === "first_day_timing_missing") return "first_day_timing";
  if (
    reason === "ownership_assigned_to_you" ||
    reason === "ownership_waiting_on_other" ||
    reason === "ownership_unassigned"
  ) {
    return "ownership";
  }
  if (reason === "bookings_missing" || reason === "bookings_no_upcoming") {
    return "bookings";
  }
  if (reason === "budget_over" || reason === "budget_tight") return "budget";
  if (reason === "packing_behind") return "packing";
  if (reason === "readiness_unknown") return "readiness";
  if (reason === "unread_activity") return "activity";
  return "readiness";
}

function isSoloTrip(trip: Trip): boolean {
  return trip.members.length <= 1 && trip.pending_invites.length === 0;
}

function sortDeterministic(items: TripWorkspaceActionItem[]): TripWorkspaceActionItem[] {
  return [...items].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byIntent = INTENT_ORDER[a.intent] - INTENT_ORDER[b.intent];
    if (byIntent !== 0) return byIntent;
    return a.id.localeCompare(b.id);
  });
}

function dedupeByIntent(items: TripWorkspaceActionItem[]): TripWorkspaceActionItem[] {
  const sorted = sortDeterministic(items);
  const selectedByIntent = new Map<TripActionIntent, TripWorkspaceActionItem>();
  for (const item of sorted) {
    if (!selectedByIntent.has(item.intent)) {
      selectedByIntent.set(item.intent, item);
    }
  }
  return sortDeterministic(Array.from(selectedByIntent.values()));
}

function deriveSystemFailureItems(input: TripActionInputs): TripWorkspaceActionItem[] {
  const ws = input.workspace;
  const items: TripWorkspaceActionItem[] = [];

  const draftErr = ws.draftActionError?.trim();
  if (draftErr) {
    items.push({
      id: "workspace-draft-mutation-error",
      reason: "workspace_draft_error",
      intent: "workspace_error",
      severity: "blocker",
      title: "Draft couldn’t update",
      detail: draftErr,
      actionLabel: "Go to publish",
      command: { kind: "focus_draft_publish" },
    });
  }

  const tripErr = ws.tripActionError?.trim();
  if (tripErr) {
    items.push({
      id: "workspace-trip-mutation-error",
      reason: "workspace_trip_error",
      intent: "workspace_error",
      severity: "blocker",
      title: "Something went wrong",
      detail: tripErr,
      actionLabel: "Open overview",
      command: { kind: "open_tab", tab: "overview" },
    });
  }

  const streamErr = ws.streamError?.trim();
  if (streamErr) {
    items.push({
      id: "workspace-stream-error",
      reason: "workspace_stream_error",
      intent: "workspace_error",
      severity: "watch",
      title: "Itinerary generation issue",
      detail: streamErr,
      actionLabel: "View status",
      command: { kind: "focus_itinerary_stream" },
    });
  }

  return sortDeterministic(items);
}

function deriveOperationalActionItems(input: TripActionInputs): TripWorkspaceActionItem[] {
  const {
    trip,
    actorEmail,
    packing,
    budget,
    reservations,
    summariesLoaded,
    itinerary,
    workspace: ws,
  } = input;
  const operationals: TripWorkspaceActionItem[] = [];

  if (ws.hasPendingDraft && !ws.isApplyingItinerary) {
    operationals.push({
      id: "workspace-draft-pending",
      reason: "draft_pending_publish",
      intent: "draft_publish",
      severity: "watch",
      title: "Draft itinerary in progress",
      detail: "Review edits and apply when the group is ready.",
      actionLabel: "Review draft",
      command: { kind: "focus_draft_publish" },
    });
  }

  const attention = buildTripAttentionItems(
    trip,
    packing,
    budget,
    reservations,
    summariesLoaded,
    itinerary,
    actorEmail,
  ).map(
    (row): TripWorkspaceActionItem => {
      const reason = toAttentionReason(row.id);
      return {
        id: row.id,
        reason,
        intent: intentForReason(reason),
        severity: row.severity,
        title: row.title,
        detail: row.detail,
        actionLabel: row.actionLabel,
        command: { kind: "open_tab", tab: row.targetTab },
      };
    },
  );

  const seen = new Set(operationals.map((item) => item.id));
  const merged = [
    ...operationals,
    ...attention.filter((item) => !seen.has(item.id)),
  ];

  if (!ws.activityMuted && ws.unreadActivityCount > 0 && merged.length === 0) {
    merged.push({
      id: "workspace-unread-activity",
      reason: "unread_activity",
      intent: "activity",
      severity: "nudge",
      title: "Unread trip activity",
      detail: `${ws.unreadActivityCount} update(s) to review.`,
      actionLabel: "Open activity",
      command: { kind: "open_activity_drawer" },
    });
  }

  return sortDeterministic(merged).slice(0, MAX_OPERATIONAL_ITEMS);
}

export function buildTripActionabilityModel(
  input: TripActionDerivationInput,
): TripActionabilityModel {
  if (input.trip === null) {
    return {
      state: "steady",
      systemFailures: [],
      rankedOperationalActions: [],
      primaryAction: null,
      secondaryActions: [],
    };
  }

  const failures = deriveSystemFailureItems(input);
  const operational = dedupeByIntent(deriveOperationalActionItems(input));
  const solo = isSoloTrip(input.trip);
  const maxSecondary = solo ? 2 : 4;
  const primaryAction = operational[0] ?? null;
  const secondaryActions = operational.slice(1, 1 + maxSecondary);

  const hasBlockerFailure = failures.some((item) => item.severity === "blocker");
  const state =
    hasBlockerFailure
      ? "blocked"
      : primaryAction
        ? "actionable"
        : "steady";

  return {
    state,
    systemFailures: failures,
    rankedOperationalActions: operational,
    primaryAction,
    secondaryActions,
  };
}

/**
 * Backward-compatible flat list used by existing callers/tests.
 * Prefer `buildTripActionabilityModel` for new UI surfaces.
 */
export function deriveTripActionItems(
  input: TripActionDerivationInput,
): TripWorkspaceActionItem[] {
  const model = buildTripActionabilityModel(input);
  return [
    ...model.systemFailures,
    ...model.rankedOperationalActions,
  ];
}

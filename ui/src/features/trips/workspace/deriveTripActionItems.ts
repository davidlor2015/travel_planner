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

export interface TripWorkspaceActionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail?: string;
  actionLabel: string;
  command: TripActionCommand;
}

const MAX_ITEMS = 5;

/**
 * Prioritized “what needs attention” items for the trip workspace.
 * Composes domain attention rules with workspace-level signals only when present.
 */
export function deriveTripActionItems(
  input: TripActionDerivationInput,
): TripWorkspaceActionItem[] {
  if (input.trip === null) {
    return [];
  }

  const {
    trip,
    packing,
    budget,
    reservations,
    summariesLoaded,
    itinerary,
    workspace: ws,
  } = input;
  const workspaceItems: TripWorkspaceActionItem[] = [];

  const draftErr = ws.draftActionError?.trim();
  if (draftErr) {
    workspaceItems.push({
      id: "workspace-draft-mutation-error",
      severity: "blocker",
      title: "Draft couldn’t update",
      detail: draftErr,
      actionLabel: "Go to publish",
      command: { kind: "focus_draft_publish" },
    });
  }

  const tripErr = ws.tripActionError?.trim();
  if (tripErr) {
    workspaceItems.push({
      id: "workspace-trip-mutation-error",
      severity: "blocker",
      title: "Something went wrong",
      detail: tripErr,
      actionLabel: "Open overview",
      command: { kind: "open_tab", tab: "overview" },
    });
  }

  const streamErr = ws.streamError?.trim();
  if (streamErr) {
    workspaceItems.push({
      id: "workspace-stream-error",
      severity: "watch",
      title: "Itinerary generation issue",
      detail: streamErr,
      actionLabel: "View status",
      command: { kind: "focus_itinerary_stream" },
    });
  }

  if (ws.hasPendingDraft && !ws.isApplyingItinerary) {
    workspaceItems.push({
      id: "workspace-draft-pending",
      severity: "watch",
      title: "Draft itinerary in progress",
      detail: "Review edits and apply when the group is ready.",
      actionLabel: "Review draft",
      command: { kind: "focus_draft_publish" },
    });
  }

  if (!ws.activityMuted && ws.unreadActivityCount > 0) {
    workspaceItems.push({
      id: "workspace-unread-activity",
      severity: "nudge",
      title: "Unread trip activity",
      detail: `${ws.unreadActivityCount} update(s) to review.`,
      actionLabel: "Open activity",
      command: { kind: "open_activity_drawer" },
    });
  }

  const attention = buildTripAttentionItems(
    trip,
    packing,
    budget,
    reservations,
    summariesLoaded,
    itinerary,
  ).map(
    (row): TripWorkspaceActionItem => ({
      id: row.id,
      severity: row.severity,
      title: row.title,
      detail: row.detail,
      actionLabel: row.actionLabel,
      command: { kind: "open_tab", tab: row.targetTab },
    }),
  );

  const seen = new Set(workspaceItems.map((w) => w.id));
  const merged: TripWorkspaceActionItem[] = [
    ...workspaceItems,
    ...attention.filter((row) => !seen.has(row.id)),
  ];

  merged.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return merged.slice(0, MAX_ITEMS);
}

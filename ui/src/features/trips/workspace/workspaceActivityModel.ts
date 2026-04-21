import type { Itinerary } from "../../../shared/api/ai";
import type { Trip } from "../../../shared/api/trips";
import type { TripActivityItem } from "../TripActivity";
import type { TripActivityType } from "../TripActivity/types";
import type { BudgetSummary, PackingSummary, ReservationSummary } from "./types";

export type WorkspaceActivityCategory =
  | "system"
  | "itinerary"
  | "bookings"
  | "budget"
  | "packing"
  | "group";

export interface WorkspaceActivitySnapshot {
  version: 1;
  trip_id: number;
  itinerary_day_count: number;
  itinerary_stop_count: number;
  itinerary_planned_count: number;
  itinerary_confirmed_count: number;
  itinerary_skipped_count: number;
  itinerary_anchor_count: number;
  has_pending_draft: boolean;
  booking_total: number;
  booking_upcoming: number;
  budget_limit: number | null;
  budget_total_spent: number;
  budget_is_over: boolean;
  packing_total: number;
  packing_checked: number;
  member_count: number;
  pending_invite_count: number;
  has_trip_notes: boolean;
  has_stream_error: boolean;
  has_draft_error: boolean;
  has_trip_error: boolean;
}

export interface WorkspaceActivityInput {
  trip: Trip;
  itinerary: Itinerary | null;
  packingSummary: PackingSummary;
  budgetSummary: BudgetSummary;
  reservationSummary: ReservationSummary;
  workspace: {
    hasPendingDraft: boolean;
    tripActionError: string | null;
    draftActionError: string | null;
    streamError: string | null;
  };
}

export interface WorkspaceActivityChange {
  id: string;
  category: WorkspaceActivityCategory;
  type: TripActivityType;
  title: string;
  detail: string;
}

export interface WorkspaceActivityStripItem {
  id: string;
  category: WorkspaceActivityCategory;
  title: string;
  detail: string;
}

export interface WorkspaceActivityModel {
  snapshot: WorkspaceActivitySnapshot;
  signature: string;
  lastSeenSignature: string | null;
  lastSeenSnapshot: WorkspaceActivitySnapshot | null;
  hasUnseenChanges: boolean;
  changes: WorkspaceActivityChange[];
  stripItems: WorkspaceActivityStripItem[];
  drawerItems: TripActivityItem[];
}

const CATEGORY_PRIORITY: Record<WorkspaceActivityCategory, number> = {
  system: 0,
  itinerary: 1,
  bookings: 2,
  budget: 3,
  packing: 4,
  group: 5,
};

function normalizeStopStatus(value: string | null | undefined): "planned" | "confirmed" | "skipped" {
  if (value === "confirmed" || value === "skipped" || value === "planned") return value;
  return "planned";
}

function activityTypeForCategory(category: WorkspaceActivityCategory): TripActivityType {
  if (category === "itinerary") return "itinerary_updated";
  if (category === "bookings") return "booking_confirmed";
  if (category === "packing") return "packing_completed";
  if (category === "group") return "member_joined";
  if (category === "budget") return "reminder_triggered";
  return "note_added";
}

function summarizeSnapshot(snapshot: WorkspaceActivitySnapshot): string {
  return [
    `v${snapshot.version}`,
    `t${snapshot.trip_id}`,
    `id${snapshot.itinerary_day_count}`,
    `is${snapshot.itinerary_stop_count}`,
    `ip${snapshot.itinerary_planned_count}`,
    `ic${snapshot.itinerary_confirmed_count}`,
    `ik${snapshot.itinerary_skipped_count}`,
    `ia${snapshot.itinerary_anchor_count}`,
    `pd${snapshot.has_pending_draft ? 1 : 0}`,
    `bt${snapshot.booking_total}`,
    `bu${snapshot.booking_upcoming}`,
    `bl${snapshot.budget_limit == null ? "n" : snapshot.budget_limit}`,
    `bs${snapshot.budget_total_spent}`,
    `bo${snapshot.budget_is_over ? 1 : 0}`,
    `pt${snapshot.packing_total}`,
    `pc${snapshot.packing_checked}`,
    `mc${snapshot.member_count}`,
    `pi${snapshot.pending_invite_count}`,
    `nt${snapshot.has_trip_notes ? 1 : 0}`,
    `se${snapshot.has_stream_error ? 1 : 0}`,
    `de${snapshot.has_draft_error ? 1 : 0}`,
    `te${snapshot.has_trip_error ? 1 : 0}`,
  ].join("|");
}

export function buildWorkspaceActivitySnapshot(
  input: WorkspaceActivityInput,
): WorkspaceActivitySnapshot {
  const items = input.itinerary?.days.flatMap((day) => day.items) ?? [];
  const anchors = input.itinerary?.days.flatMap((day) => day.anchors ?? []) ?? [];
  let planned = 0;
  let confirmed = 0;
  let skipped = 0;
  for (const item of items) {
    const status = normalizeStopStatus(item.status);
    if (status === "planned") planned += 1;
    if (status === "confirmed") confirmed += 1;
    if (status === "skipped") skipped += 1;
  }

  return {
    version: 1,
    trip_id: input.trip.id,
    itinerary_day_count: input.itinerary?.days.length ?? 0,
    itinerary_stop_count: items.length,
    itinerary_planned_count: planned,
    itinerary_confirmed_count: confirmed,
    itinerary_skipped_count: skipped,
    itinerary_anchor_count: anchors.length,
    has_pending_draft: input.workspace.hasPendingDraft,
    booking_total: input.reservationSummary.total ?? 0,
    booking_upcoming: input.reservationSummary.upcoming ?? 0,
    budget_limit: input.budgetSummary.limit ?? null,
    budget_total_spent: input.budgetSummary.totalSpent ?? 0,
    budget_is_over: input.budgetSummary.isOverBudget,
    packing_total: input.packingSummary.total ?? 0,
    packing_checked: input.packingSummary.checked ?? 0,
    member_count: input.trip.members.length,
    pending_invite_count: input.trip.pending_invites.length,
    has_trip_notes: Boolean(input.trip.notes?.trim()),
    has_stream_error: Boolean(input.workspace.streamError?.trim()),
    has_draft_error: Boolean(input.workspace.draftActionError?.trim()),
    has_trip_error: Boolean(input.workspace.tripActionError?.trim()),
  };
}

export function workspaceActivitySignature(snapshot: WorkspaceActivitySnapshot): string {
  return summarizeSnapshot(snapshot);
}

function pushChange(
  changes: WorkspaceActivityChange[],
  category: WorkspaceActivityCategory,
  id: string,
  title: string,
  detail: string,
) {
  changes.push({
    id,
    category,
    type: activityTypeForCategory(category),
    title,
    detail,
  });
}

export function deriveWorkspaceActivityChanges(
  current: WorkspaceActivitySnapshot,
  previous: WorkspaceActivitySnapshot | null,
): WorkspaceActivityChange[] {
  if (!previous) return [];
  const changes: WorkspaceActivityChange[] = [];

  if (
    current.has_stream_error !== previous.has_stream_error ||
    current.has_draft_error !== previous.has_draft_error ||
    current.has_trip_error !== previous.has_trip_error
  ) {
    pushChange(
      changes,
      "system",
      "system-state-changed",
      "Workspace system state changed",
      "A workspace status signal changed since your last check.",
    );
  }

  if (
    current.itinerary_day_count !== previous.itinerary_day_count ||
    current.itinerary_stop_count !== previous.itinerary_stop_count ||
    current.itinerary_planned_count !== previous.itinerary_planned_count ||
    current.itinerary_confirmed_count !== previous.itinerary_confirmed_count ||
    current.itinerary_anchor_count !== previous.itinerary_anchor_count ||
    current.has_pending_draft !== previous.has_pending_draft
  ) {
    pushChange(
      changes,
      "itinerary",
      "itinerary-shape-changed",
      "Itinerary changed",
      `${current.itinerary_day_count} day(s), ${current.itinerary_stop_count} stop(s), ${current.itinerary_anchor_count} anchor(s).`,
    );
  }

  if (
    current.booking_total !== previous.booking_total ||
    current.booking_upcoming !== previous.booking_upcoming
  ) {
    pushChange(
      changes,
      "bookings",
      "bookings-changed",
      "Bookings changed",
      `${current.booking_upcoming} upcoming of ${current.booking_total} total.`,
    );
  }

  if (
    current.budget_is_over !== previous.budget_is_over ||
    current.budget_total_spent !== previous.budget_total_spent ||
    current.budget_limit !== previous.budget_limit
  ) {
    pushChange(
      changes,
      "budget",
      "budget-changed",
      "Budget changed",
      current.budget_limit != null && current.budget_limit > 0
        ? `$${current.budget_total_spent.toLocaleString()} of $${current.budget_limit.toLocaleString()}.`
        : "Budget state changed.",
    );
  }

  if (
    current.packing_total !== previous.packing_total ||
    current.packing_checked !== previous.packing_checked
  ) {
    pushChange(
      changes,
      "packing",
      "packing-changed",
      "Packing changed",
      `${current.packing_checked}/${current.packing_total} packed.`,
    );
  }

  if (
    current.member_count !== previous.member_count ||
    current.pending_invite_count !== previous.pending_invite_count
  ) {
    pushChange(
      changes,
      "group",
      "group-state-changed",
      "Group changed",
      `${current.member_count} member(s), ${current.pending_invite_count} pending invite(s).`,
    );
  }

  return changes.sort((a, b) => {
    return (
      CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
      a.id.localeCompare(b.id)
    );
  });
}

export function rollupWorkspaceActivityChanges(
  changes: WorkspaceActivityChange[],
  maxItems = 3,
): WorkspaceActivityStripItem[] {
  const byCategory = new Map<WorkspaceActivityCategory, WorkspaceActivityChange>();
  for (const change of changes) {
    if (!byCategory.has(change.category)) {
      byCategory.set(change.category, change);
    }
  }
  return Array.from(byCategory.values())
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category])
    .slice(0, maxItems)
    .map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      detail: item.detail,
    }));
}

export function coerceWorkspaceActivitySnapshot(
  value: Record<string, unknown> | null | undefined,
): WorkspaceActivitySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const version = value.version;
  if (version !== 1) return null;
  const tripId = value.trip_id;
  if (typeof tripId !== "number") return null;

  const readNumber = (key: keyof WorkspaceActivitySnapshot): number | null =>
    typeof value[key] === "number" ? (value[key] as number) : null;
  const readBoolean = (key: keyof WorkspaceActivitySnapshot): boolean | null =>
    typeof value[key] === "boolean" ? (value[key] as boolean) : null;

  const itineraryDayCount = readNumber("itinerary_day_count");
  const itineraryStopCount = readNumber("itinerary_stop_count");
  const itineraryPlannedCount = readNumber("itinerary_planned_count");
  const itineraryConfirmedCount = readNumber("itinerary_confirmed_count");
  const itinerarySkippedCount = readNumber("itinerary_skipped_count");
  const itineraryAnchorCount = readNumber("itinerary_anchor_count");
  const bookingTotal = readNumber("booking_total");
  const bookingUpcoming = readNumber("booking_upcoming");
  const budgetTotalSpent = readNumber("budget_total_spent");
  const packingTotal = readNumber("packing_total");
  const packingChecked = readNumber("packing_checked");
  const memberCount = readNumber("member_count");
  const pendingInviteCount = readNumber("pending_invite_count");
  const hasPendingDraft = readBoolean("has_pending_draft");
  const hasTripNotes = readBoolean("has_trip_notes");
  const hasStreamError = readBoolean("has_stream_error");
  const hasDraftError = readBoolean("has_draft_error");
  const hasTripError = readBoolean("has_trip_error");
  const budgetIsOver = readBoolean("budget_is_over");
  const budgetLimitRaw = value.budget_limit;
  const budgetLimit =
    budgetLimitRaw === null || typeof budgetLimitRaw === "number"
      ? (budgetLimitRaw as number | null)
      : undefined;

  if (
    itineraryDayCount == null ||
    itineraryStopCount == null ||
    itineraryPlannedCount == null ||
    itineraryConfirmedCount == null ||
    itinerarySkippedCount == null ||
    itineraryAnchorCount == null ||
    bookingTotal == null ||
    bookingUpcoming == null ||
    budgetTotalSpent == null ||
    budgetIsOver == null ||
    packingTotal == null ||
    packingChecked == null ||
    memberCount == null ||
    pendingInviteCount == null ||
    hasPendingDraft == null ||
    hasTripNotes == null ||
    hasStreamError == null ||
    hasDraftError == null ||
    hasTripError == null ||
    budgetLimit === undefined
  ) {
    return null;
  }

  return {
    version: 1,
    trip_id: tripId,
    itinerary_day_count: itineraryDayCount,
    itinerary_stop_count: itineraryStopCount,
    itinerary_planned_count: itineraryPlannedCount,
    itinerary_confirmed_count: itineraryConfirmedCount,
    itinerary_skipped_count: itinerarySkippedCount,
    itinerary_anchor_count: itineraryAnchorCount,
    has_pending_draft: hasPendingDraft,
    booking_total: bookingTotal,
    booking_upcoming: bookingUpcoming,
    budget_limit: budgetLimit,
    budget_total_spent: budgetTotalSpent,
    budget_is_over: budgetIsOver,
    packing_total: packingTotal,
    packing_checked: packingChecked,
    member_count: memberCount,
    pending_invite_count: pendingInviteCount,
    has_trip_notes: hasTripNotes,
    has_stream_error: hasStreamError,
    has_draft_error: hasDraftError,
    has_trip_error: hasTripError,
  };
}

export function buildWorkspaceActivityModel(params: {
  input: WorkspaceActivityInput;
  lastSeenSignature: string | null;
  lastSeenSnapshot: WorkspaceActivitySnapshot | null;
}): WorkspaceActivityModel {
  const snapshot = buildWorkspaceActivitySnapshot(params.input);
  const signature = workspaceActivitySignature(snapshot);
  const changes = deriveWorkspaceActivityChanges(snapshot, params.lastSeenSnapshot);
  const stripItems: WorkspaceActivityStripItem[] =
    changes.length > 0
      ? rollupWorkspaceActivityChanges(changes, 3)
      : params.lastSeenSignature &&
          params.lastSeenSignature !== signature
        ? [
            {
              id: "workspace-signature-changed",
              category: "system" as const,
              title: "Workspace changed",
              detail: "Changes were detected since your last check.",
            },
          ]
        : [];

  const hasUnseenChanges =
    params.lastSeenSignature != null &&
    params.lastSeenSignature !== signature &&
    stripItems.length > 0;

  const drawerItems: TripActivityItem[] = stripItems.map((item) => ({
    id: item.id,
    tripId: params.input.trip.id,
    tripLabel: params.input.trip.title,
    type: activityTypeForCategory(item.category),
    title: item.title,
    detail: item.detail,
    occurredAt: null,
    unreadHint: "Since last seen",
  }));

  return {
    snapshot,
    signature,
    lastSeenSignature: params.lastSeenSignature,
    lastSeenSnapshot: params.lastSeenSnapshot,
    hasUnseenChanges,
    changes,
    stripItems,
    drawerItems,
  };
}

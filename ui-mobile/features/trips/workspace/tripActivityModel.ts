import type { Itinerary } from "@/features/ai/api";
import type { TripActivityItem, TripOnTripSnapshot, TripResponse } from "@/features/trips/types";

import type { TripSummaryViewModel } from "./adapters";

type ActivitySnapshot = {
  version: 1;
  trip_id: number;
  itinerary_day_count: number;
  itinerary_stop_count: number;
  reservation_upcoming: number;
  reservation_total: number;
  budget_spent: number;
  budget_limit: number | null;
  packing_checked: number;
  packing_total: number;
  member_count: number;
  pending_invite_count: number;
  execution_confirmed_count: number;
  execution_skipped_count: number;
};

type ActivityModelInput = {
  trip: TripResponse;
  itinerary: Itinerary | null;
  summary: TripSummaryViewModel | null;
  onTripSnapshot: TripOnTripSnapshot | null;
  lastSeenSnapshot: Record<string, unknown> | null;
  now?: Date;
};

export type TripActivityModel = {
  items: TripActivityItem[];
  snapshot: ActivitySnapshot;
  signature: string;
  unseenCount: number;
};

function actorNameForSnapshotStop(stop: TripOnTripSnapshot["today_stops"][number]): string | undefined {
  const display = stop.status_updated_by_display_name?.trim();
  if (display) return display;
  const email = stop.status_updated_by_email?.trim();
  if (!email) return undefined;
  const local = email.split("@")[0]?.trim();
  if (!local) return email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildSnapshot(input: ActivityModelInput): ActivitySnapshot {
  const itineraryDays = input.itinerary?.days ?? [];
  const itineraryStops = itineraryDays.flatMap((day) => day.items).length;
  const executionStops = input.onTripSnapshot?.today_stops ?? [];
  const executionConfirmedCount = executionStops.filter(
    (stop) => (stop.execution_status ?? stop.status ?? "planned") === "confirmed",
  ).length;
  const executionSkippedCount = executionStops.filter(
    (stop) => (stop.execution_status ?? stop.status ?? "planned") === "skipped",
  ).length;

  return {
    version: 1,
    trip_id: input.trip.id,
    itinerary_day_count: itineraryDays.length,
    itinerary_stop_count: itineraryStops,
    reservation_upcoming: input.summary?.reservationUpcoming ?? 0,
    reservation_total: input.summary?.reservationCount ?? 0,
    budget_spent: input.summary?.budgetSpent ?? 0,
    budget_limit: input.summary?.budgetLimit ?? null,
    packing_checked: input.summary?.packingChecked ?? 0,
    packing_total: input.summary?.packingTotal ?? 0,
    member_count: input.trip.member_count,
    pending_invite_count: input.trip.pending_invites.length,
    execution_confirmed_count: executionConfirmedCount,
    execution_skipped_count: executionSkippedCount,
  };
}

function coerceSnapshot(value: Record<string, unknown> | null): ActivitySnapshot | null {
  if (!value || value.version !== 1) return null;
  const asNumber = (key: keyof ActivitySnapshot) =>
    typeof value[key] === "number" ? (value[key] as number) : null;
  const itineraryDayCount = asNumber("itinerary_day_count");
  const itineraryStopCount = asNumber("itinerary_stop_count");
  const reservationUpcoming = asNumber("reservation_upcoming");
  const reservationTotal = asNumber("reservation_total");
  const budgetSpent = asNumber("budget_spent");
  const packingChecked = asNumber("packing_checked");
  const packingTotal = asNumber("packing_total");
  const memberCount = asNumber("member_count");
  const pendingInviteCount = asNumber("pending_invite_count");
  const executionConfirmedCount = asNumber("execution_confirmed_count");
  const executionSkippedCount = asNumber("execution_skipped_count");
  const budgetLimitRaw = value.budget_limit;
  const budgetLimit =
    budgetLimitRaw === null || typeof budgetLimitRaw === "number"
      ? (budgetLimitRaw as number | null)
      : undefined;
  const tripId = asNumber("trip_id");
  if (
    itineraryDayCount === null ||
    itineraryStopCount === null ||
    reservationUpcoming === null ||
    reservationTotal === null ||
    budgetSpent === null ||
    packingChecked === null ||
    packingTotal === null ||
    memberCount === null ||
    pendingInviteCount === null ||
    executionConfirmedCount === null ||
    executionSkippedCount === null ||
    budgetLimit === undefined ||
    tripId === null
  ) {
    return null;
  }
  return {
    version: 1,
    trip_id: tripId,
    itinerary_day_count: itineraryDayCount,
    itinerary_stop_count: itineraryStopCount,
    reservation_upcoming: reservationUpcoming,
    reservation_total: reservationTotal,
    budget_spent: budgetSpent,
    budget_limit: budgetLimit,
    packing_checked: packingChecked,
    packing_total: packingTotal,
    member_count: memberCount,
    pending_invite_count: pendingInviteCount,
    execution_confirmed_count: executionConfirmedCount,
    execution_skipped_count: executionSkippedCount,
  };
}

function snapshotSignature(snapshot: ActivitySnapshot): string {
  return [
    "v1",
    `t${snapshot.trip_id}`,
    `id${snapshot.itinerary_day_count}`,
    `is${snapshot.itinerary_stop_count}`,
    `ru${snapshot.reservation_upcoming}`,
    `rt${snapshot.reservation_total}`,
    `bs${snapshot.budget_spent}`,
    `bl${snapshot.budget_limit == null ? "n" : snapshot.budget_limit}`,
    `pc${snapshot.packing_checked}`,
    `pt${snapshot.packing_total}`,
    `mc${snapshot.member_count}`,
    `pi${snapshot.pending_invite_count}`,
    `ec${snapshot.execution_confirmed_count}`,
    `es${snapshot.execution_skipped_count}`,
  ].join("|");
}

function pushSnapshotDiffItems(
  next: ActivitySnapshot,
  previous: ActivitySnapshot | null,
  nowIso: string,
  out: TripActivityItem[],
): void {
  if (!previous) return;
  if (
    next.itinerary_day_count !== previous.itinerary_day_count ||
    next.itinerary_stop_count !== previous.itinerary_stop_count
  ) {
    out.push({
      id: "itinerary-changed",
      actionLabel: "updated the itinerary",
      entityLabel: `${next.itinerary_day_count} day${next.itinerary_day_count === 1 ? "" : "s"}, ${next.itinerary_stop_count} stop${next.itinerary_stop_count === 1 ? "" : "s"}`,
      createdAt: nowIso,
      category: "itinerary",
    });
  }
  if (
    next.reservation_total !== previous.reservation_total ||
    next.reservation_upcoming !== previous.reservation_upcoming
  ) {
    out.push({
      id: "booking-changed",
      actionLabel: "updated bookings",
      entityLabel: `${next.reservation_upcoming} upcoming`,
      createdAt: nowIso,
      category: "booking",
    });
  }
  if (
    next.budget_spent !== previous.budget_spent ||
    next.budget_limit !== previous.budget_limit
  ) {
    out.push({
      id: "budget-changed",
      actionLabel: "updated the budget",
      entityLabel:
        next.budget_limit != null && next.budget_limit > 0
          ? `$${Math.round(next.budget_spent)} of $${Math.round(next.budget_limit)}`
          : `$${Math.round(next.budget_spent)} spent`,
      createdAt: nowIso,
      category: "budget",
    });
  }
  if (
    next.packing_checked !== previous.packing_checked ||
    next.packing_total !== previous.packing_total
  ) {
    out.push({
      id: "packing-changed",
      actionLabel: "updated the packing list",
      entityLabel: `${next.packing_checked}/${next.packing_total} packed`,
      createdAt: nowIso,
      category: "packing",
    });
  }
  if (
    next.member_count !== previous.member_count ||
    next.pending_invite_count !== previous.pending_invite_count
  ) {
    out.push({
      id: "member-changed",
      actionLabel: "updated trip members",
      entityLabel: `${next.member_count} member${next.member_count === 1 ? "" : "s"}`,
      createdAt: nowIso,
      category: "member",
    });
  }
}

export function buildTripActivityModel(input: ActivityModelInput): TripActivityModel {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const snapshot = buildSnapshot(input);
  const signature = snapshotSignature(snapshot);
  const previousSnapshot = coerceSnapshot(input.lastSeenSnapshot);

  const items: TripActivityItem[] = [];
  pushSnapshotDiffItems(snapshot, previousSnapshot, nowIso, items);

  for (const stop of input.onTripSnapshot?.today_stops ?? []) {
    const status = stop.execution_status ?? stop.status;
    if (status !== "confirmed" && status !== "skipped") continue;
    const updatedAt = stop.status_updated_at;
    if (!updatedAt) continue;
    items.push({
      id: `execution-${stop.stop_ref ?? stop.title ?? updatedAt}-${status}`,
      actorName: actorNameForSnapshotStop(stop),
      actionLabel: status === "confirmed" ? "confirmed" : "skipped",
      entityLabel: stop.title?.trim() || "a stop",
      createdAt: updatedAt,
      category: "execution",
    });
  }

  items.sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
  });

  const unseenCount =
    previousSnapshot && snapshotSignature(previousSnapshot) !== signature
      ? items.length
      : 0;

  return {
    items,
    snapshot,
    signature,
    unseenCount,
  };
}

export function formatActivityTimestamp(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const deltaMs = now.getTime() - date.getTime();
  if (deltaMs < 60_000 && deltaMs >= 0) return "Just now";
  if (deltaMs < 60 * 60_000 && deltaMs >= 0) {
    const minutes = Math.max(1, Math.round(deltaMs / 60_000));
    return `${minutes}m ago`;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((today - target) / 86_400_000);
  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatActivitySentence(item: TripActivityItem): string {
  const actor = item.actorName?.trim() || null;
  const entity = item.entityLabel?.trim() || null;
  if (actor && entity) return `${actor} ${item.actionLabel} ${entity}`;
  if (actor) return `${actor} ${item.actionLabel}`;
  if (entity) return `${item.actionLabel} ${entity}`;
  return item.actionLabel;
}

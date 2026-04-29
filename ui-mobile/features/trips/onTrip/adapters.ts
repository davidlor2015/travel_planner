// Path: ui-mobile/features/trips/onTrip/adapters.ts
// Summary: Implements adapters module logic.

import { stopTimeToMinutes } from "@/features/trips/stopTime";
import type {
  TripExecutionStatus,
  TripOnTripBlocker,
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
  TripOnTripUnplannedStop,
} from "../types";

export type StopVM = TripOnTripStopSnapshot & {
  key: string;
  effectiveStatus: TripExecutionStatus;
  isPending: boolean;
  isReadOnly: boolean;
  statusUpdatedByUserId: number | null;
  statusUpdatedByName: string | null;
  statusUpdatedAt: string | null;
  statusActionLabel: string | null;
  statusActionDetailLabel: string | null;
};

export type TimelineVariant = "done" | "now" | "next" | "upcoming";

export type OnTripViewModel = {
  now: StopVM | null;
  next: StopVM | null;
  timeline: StopVM[];
  unplanned: (TripOnTripUnplannedStop & { isPending: boolean })[];
  blockers: TripOnTripBlocker[];
  defaultLogDate: string;
  isReadOnly: boolean;
  /** True when today has stops and every one is confirmed or skipped. */
  isDayComplete: boolean;
};

export function todayLocalISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentLocalMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

function deriveCurrentStop(
  stops: TripOnTripStopSnapshot[],
  nowMinutes: number,
): TripOnTripStopSnapshot | null {
  let best: { stop: TripOnTripStopSnapshot; startedAt: number } | null = null;
  for (const stop of stops) {
    const status = stop.execution_status ?? stop.status ?? "planned";
    if (status === "confirmed" || status === "skipped") continue;
    const startedAt = stopTimeToMinutes(stop.time);
    if (startedAt == null || startedAt > nowMinutes) continue;
    if (!best || startedAt > best.startedAt) best = { stop, startedAt };
  }
  return best?.stop ?? null;
}

function findStopIndex(
  stops: TripOnTripStopSnapshot[],
  target: TripOnTripStopSnapshot,
): number {
  if (target.stop_ref) {
    const byRef = stops.findIndex((stop) => stop.stop_ref === target.stop_ref);
    if (byRef >= 0) return byRef;
  }

  const byContent = stops.findIndex(
    (stop) =>
      stop.title === target.title &&
      stop.time === target.time &&
      stop.location === target.location,
  );
  return byContent >= 0 ? byContent : 0;
}

function toStopVM(
  stop: TripOnTripStopSnapshot,
  index: number,
  statusPending: Record<string, boolean>,
  isReadOnly: boolean,
): StopVM {
  const effectiveStatus: TripExecutionStatus =
    stop.execution_status ?? stop.status ?? "planned";
  const isPending = stop.stop_ref
    ? (statusPending[stop.stop_ref] ?? false)
    : false;
  const statusUpdatedByName = formatActorName(
    stop.status_updated_by_display_name,
    stop.status_updated_by_email,
  );
  const statusActionLabel = buildStatusActionLabel(
    effectiveStatus,
    statusUpdatedByName,
  );
  return {
    ...stop,
    key: stop.stop_ref ?? `stop-${index}`,
    effectiveStatus,
    isPending,
    isReadOnly,
    statusUpdatedByUserId: stop.status_updated_by_user_id ?? null,
    statusUpdatedByName,
    statusUpdatedAt: stop.status_updated_at ?? null,
    statusActionLabel,
    statusActionDetailLabel: buildStatusActionLabel(
      effectiveStatus,
      statusUpdatedByName,
      stop.status_updated_at,
    ),
  };
}

function formatActorName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const display = displayName?.trim();
  if (display) return display;
  const rawEmail = email?.trim();
  if (!rawEmail) return null;
  const local = rawEmail.split("@")[0]?.trim();
  if (!local) return rawEmail;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildStatusActionLabel(
  status: TripExecutionStatus,
  actorName: string | null,
  updatedAt?: string | null,
): string | null {
  if (status !== "confirmed" && status !== "skipped") return null;
  const verb = status === "confirmed" ? "Confirmed" : "Skipped";
  const base = actorName ? `${verb} by ${actorName}` : verb;
  const time = formatStatusActionTime(updatedAt);
  return time ? `${base} · ${time}` : base;
}

function formatStatusActionTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "just now";
  if (diffMs >= 0 && diffMs < 60 * 60_000) {
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    return `${minutes}m ago`;
  }
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Returns true when a stop's day identity matches the displayed today. */
function stopBelongsToToday(
  stop: TripOnTripStopSnapshot,
  today: TripOnTripStopSnapshot,
): boolean {
  if (stop.day_date && today.day_date) return stop.day_date === today.day_date;
  if (stop.day_number !== null && today.day_number !== null)
    return stop.day_number === today.day_number;
  return true; // can't determine; assume same day rather than discard
}

export function deriveOnTripViewModel(
  snapshot: TripOnTripSnapshot,
  statusPending: Record<string, boolean>,
  unplannedPendingIds: Record<number, boolean>,
): OnTripViewModel {
  const isReadOnly = snapshot.read_only;
  const nowMinutes = currentLocalMinutes();

  const stops = snapshot.today_stops;
  const currentRaw = deriveCurrentStop(stops, nowMinutes);
  const currentIndex = currentRaw ? findStopIndex(stops, currentRaw) : -1;

  const timeline = stops.map((s, i) =>
    toStopVM(s, i, statusPending, isReadOnly),
  );

  const nowVm = currentRaw
    ? toStopVM(currentRaw, currentIndex, statusPending, isReadOnly)
    : null;

  const nowKey = nowVm?.key ?? null;

  // Only use the server's next_stop when it belongs to the same itinerary day.
  // If it points to tomorrow or another day, fall back to the first unresolved
  // stop in today_stops so the top card never crosses a day boundary.
  const serverNext = snapshot.next_stop;
  const sameDay = serverNext
    ? stopBelongsToToday(serverNext, snapshot.today)
    : false;
  const nextRaw = sameDay
    ? serverNext
    : (stops.find((s) => {
        if (currentRaw?.stop_ref && s.stop_ref === currentRaw.stop_ref)
          return false;
        const st = s.execution_status ?? s.status ?? "planned";
        return st !== "confirmed" && st !== "skipped";
      }) ?? null);

  const nextIndex = nextRaw ? findStopIndex(stops, nextRaw) : -1;
  const nextCandidate = nextRaw
    ? toStopVM(nextRaw, nextIndex, statusPending, isReadOnly)
    : null;
  const nextVm =
    nextCandidate && nextCandidate.key !== nowKey ? nextCandidate : null;

  const unplanned = snapshot.today_unplanned.map((u) => ({
    ...u,
    isPending: unplannedPendingIds[u.event_id] ?? false,
  }));

  const defaultLogDate = snapshot.today.day_date ?? todayLocalISODate();

  // Recompute the "today-planned-open" blocker from the effective status of each
  // stop so optimistic updates immediately clear the counter once all stops are
  // confirmed or skipped — the server-side count can lag behind local taps.
  const unresolvedCount = timeline.filter(
    (s) => s.effectiveStatus !== "confirmed" && s.effectiveStatus !== "skipped",
  ).length;

  const otherBlockers = snapshot.blockers.filter(
    (b) => b.id !== "today-planned-open",
  );
  const effectiveBlockers: TripOnTripBlocker[] =
    unresolvedCount > 0
      ? [
          {
            id: "today-planned-open",
            bucket: "on_trip_execution",
            severity: "watch",
            title: `${unresolvedCount} ${unresolvedCount === 1 ? "stop" : "stops"} still need review`,
            detail: String(unresolvedCount),
            owner_email: null,
          },
          ...otherBlockers,
        ]
      : otherBlockers;

  const isDayComplete =
    timeline.length > 0 &&
    timeline.every(
      (s) =>
        s.effectiveStatus === "confirmed" || s.effectiveStatus === "skipped",
    );

  return {
    now: nowVm,
    next: nextVm,
    timeline,
    unplanned,
    blockers: effectiveBlockers,
    defaultLogDate,
    isReadOnly,
    isDayComplete,
  };
}

/** Builds a StopVM from a raw snapshot stop for the detail view. */
export function toStopVmForDetail(
  stop: TripOnTripStopSnapshot,
  isPending: boolean,
  isReadOnly: boolean,
): StopVM {
  return toStopVM(
    stop,
    0,
    isPending ? { [stop.stop_ref ?? ""]: true } : {},
    isReadOnly,
  );
}

export function stopVariant(
  stop: StopVM,
  nowKey: string | null,
  nextKey: string | null,
): TimelineVariant {
  const done =
    stop.effectiveStatus === "confirmed" || stop.effectiveStatus === "skipped";
  if (done) return "done";
  if (stop.key === nowKey) return "now";
  if (stop.key === nextKey) return "next";
  return "upcoming";
}

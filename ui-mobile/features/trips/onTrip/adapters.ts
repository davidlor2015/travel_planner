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

function parseTimeToMinutes(time: string | null | undefined): number | null {
  const raw = time?.trim() ?? "";
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1]!, 10);
  const minute = parseInt(m[2]!, 10);
  const suffix = m[3]?.toLowerCase();
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function deriveCurrentStop(
  stops: TripOnTripStopSnapshot[],
  nowMinutes: number,
): TripOnTripStopSnapshot | null {
  let best: { stop: TripOnTripStopSnapshot; startedAt: number } | null = null;
  for (const stop of stops) {
    const status = stop.execution_status ?? stop.status ?? "planned";
    if (status === "confirmed" || status === "skipped") continue;
    const startedAt = parseTimeToMinutes(stop.time);
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
  const isPending = stop.stop_ref ? (statusPending[stop.stop_ref] ?? false) : false;
  return {
    ...stop,
    key: stop.stop_ref ?? `stop-${index}`,
    effectiveStatus,
    isPending,
    isReadOnly,
  };
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

  const timeline = stops.map((s, i) => toStopVM(s, i, statusPending, isReadOnly));

  const nowVm = currentRaw
    ? toStopVM(currentRaw, currentIndex, statusPending, isReadOnly)
    : null;

  const nowKey = nowVm?.key ?? null;
  const nextRaw = snapshot.next_stop;
  const nextIndex = nextRaw ? findStopIndex(stops, nextRaw) : -1;
  const nextCandidate = nextRaw ? toStopVM(nextRaw, nextIndex, statusPending, isReadOnly) : null;
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

  const otherBlockers = snapshot.blockers.filter((b) => b.id !== "today-planned-open");
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

  return {
    now: nowVm,
    next: nextVm,
    timeline,
    unplanned,
    blockers: effectiveBlockers,
    defaultLogDate,
    isReadOnly,
  };
}

/** Builds a StopVM from a raw snapshot stop for the detail view. */
export function toStopVmForDetail(
  stop: TripOnTripStopSnapshot,
  isPending: boolean,
  isReadOnly: boolean,
): StopVM {
  return toStopVM(stop, 0, isPending ? { [stop.stop_ref ?? ""]: true } : {}, isReadOnly);
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

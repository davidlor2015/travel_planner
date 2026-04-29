// Path: ui/src/features/trips/workspace/onTrip/hooks/useOnTripMutations.ts
// Summary: Provides useOnTripMutations hook behavior.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteExecutionEvent,
  getTripOnTripSnapshot,
  postStopStatus,
  postUnplannedStop,
  type TripExecutionStatus,
  type TripOnTripSnapshot,
  type TripOnTripStopSnapshot,
  type UnplannedStopPayload,
} from "../../../../../shared/api/trips";

export type MutationFeedback = {
  kind: "error" | "success";
  message: string;
  at: number;
};

export type StatusOverride = TripExecutionStatus;

type OptimisticEntry =
  | { kind: "pending"; requestId: number; target: TripExecutionStatus }
  | { kind: "committed"; requestId: number; target: TripExecutionStatus };

export type UseOnTripMutationsOptions = {
  token: string;
  tripId: number | null;
  snapshot: TripOnTripSnapshot | null;
  onSnapshotRefresh: (snapshot: TripOnTripSnapshot) => void;
};

export type UseOnTripMutationsResult = {
  /**
   * Render-ready snapshot with local overrides applied.
   *
   * Any optimistic status taps or unplanned-stop adds/deletes that have not
   * yet been reconciled with a fresh server snapshot are merged in here.
   */
  viewSnapshot: TripOnTripSnapshot | null;
  statusPending: Record<string, boolean>;
  unplannedPendingIds: Record<number, boolean>;
  isLoggingUnplanned: boolean;
  feedback: MutationFeedback | null;
  dismissFeedback: () => void;
  setStopStatus: (stopRef: string, nextStatus: TripExecutionStatus) => Promise<void>;
  logUnplannedStop: (payload: UnplannedStopPayload) => Promise<void>;
  removeUnplannedStop: (eventId: number) => Promise<void>;
};

type OptimisticState = {
  statusByRef: Record<string, OptimisticEntry>;
  deletedUnplannedIds: Record<number, true>;
};

const emptyOptimisticState = (): OptimisticState => ({
  statusByRef: {},
  deletedUnplannedIds: {},
});

/**
 * Generate an opaque per-submission idempotency token used by the server to
 * collapse a retried POST onto the originally-persisted row. Prefer the
 * platform UUID when available; fall back to a time+random string when the
 * page is loaded in a non-secure context where `crypto.randomUUID` is not
 * exposed. Kept at module scope so the hook remains pure for tests that only
 * need to assert an `id` is present on the wire payload.
 */
function generateClientRequestId(): string {
  const maybeUuid = globalThis.crypto?.randomUUID;
  if (typeof maybeUuid === "function") return maybeUuid.call(globalThis.crypto);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useOnTripMutations({
  token,
  tripId,
  snapshot,
  onSnapshotRefresh,
}: UseOnTripMutationsOptions): UseOnTripMutationsResult {
  const [optimistic, setOptimistic] = useState<OptimisticState>(emptyOptimisticState());
  // A counter, not a boolean map, so overlapping writes for the same stop_ref
  // do not visibly flicker off when an earlier tap's finally runs while a
  // later tap is still queued behind it.
  const [pendingCountByRef, setPendingCountByRef] = useState<Record<string, number>>({});
  const [unplannedPendingIds, setUnplannedPendingIds] = useState<Record<number, boolean>>({});
  const [isLoggingUnplanned, setIsLoggingUnplanned] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | null>(null);
  // Per-`stop_ref` promise chain that serializes network writes without
  // blocking other stops. Rapid Confirm->Skip taps on the same stop would
  // otherwise race on the wire and the server's "latest row wins" rule could
  // promote the wrong terminal state if the later POST happened to arrive
  // first. Cleared when the trailing promise for a ref settles.
  const statusQueueRef = useRef<Map<string, Promise<unknown>>>(new Map());

  // Track trip changes so stale overrides from a previous selection never leak
  // into a different trip's render. Mutations are always local to the current trip.
  const lastTripIdRef = useRef<number | null>(tripId);
  if (lastTripIdRef.current !== tripId) {
    lastTripIdRef.current = tripId;
    if (
      Object.keys(optimistic.statusByRef).length > 0 ||
      Object.keys(optimistic.deletedUnplannedIds).length > 0
    ) {
      setOptimistic(emptyOptimisticState());
    }
  }

  // Track the last refresh timestamp so coalescing visibility + focus events
  // does not fire two fetches back-to-back when a tab resume triggers both.
  const lastRefreshAtRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);
  const lastInteractionAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!tripId) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const mark = () => {
      lastInteractionAtRef.current = Date.now();
    };

    window.addEventListener("pointerdown", mark, { passive: true });
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark);
    };
  }, [tripId]);

  const reconcileOptimistic = useCallback(
    (prev: OptimisticState, next: TripOnTripSnapshot): OptimisticState => {
      const nextMap: Record<string, OptimisticEntry> = {};
      for (const [stopRef, entry] of Object.entries(prev.statusByRef)) {
        const server = next.today_stops.find((s) => s.stop_ref === stopRef);
        const serverStatus = server?.execution_status ?? null;

        if (entry.kind === "pending") {
          // Keep pending entries until the mutation path commits.
          nextMap[stopRef] = entry;
          continue;
        }

        // committed: clear once server agrees; otherwise surface an error and
        // clear. The user's change did NOT stick (another device may have
        // overridden it, or the server applied a different rule), so the UI
        // must not claim success — the override snaps back to the server
        // state and the toast copy matches that reality.
        if (serverStatus === entry.target) {
          continue;
        }

        setFeedback({
          kind: "error",
          message: `Update was reverted by server (now: ${serverStatus ?? "planned"}).`,
          at: Date.now(),
        });
      }

      return {
        ...prev,
        statusByRef: nextMap,
      };
    },
    [],
  );

  const refreshSnapshot = useCallback(async () => {
    if (!tripId) return;
    try {
      const next = await getTripOnTripSnapshot(token, tripId);
      lastRefreshAtRef.current = Date.now();
      onSnapshotRefresh(next);
      setOptimistic((prev) => reconcileOptimistic(prev, next));
    } catch {
      // Non-fatal: keep any existing overrides so the UI doesn't flash.
    }
  }, [onSnapshotRefresh, reconcileOptimistic, token, tripId]);

  // Background refresh: while a trip is selected, re-fetch the snapshot every
  // 20s while the user is active and 60s while idle so state converges across
  // devices without spamming the network when the user isn't engaging.
  useEffect(() => {
    if (!tripId) return;
    const intervalId = setInterval(() => {
      const idleForMs = Date.now() - lastInteractionAtRef.current;
      const isActive = idleForMs < 60_000;
      const minInterval = isActive ? 20_000 : 60_000;
      if (Date.now() - lastRefreshAtRef.current < minInterval) return;
      void refreshSnapshot();
    }, 20_000);
    return () => clearInterval(intervalId);
  }, [tripId, refreshSnapshot]);

  // Foreground refresh: when the user returns to the app (tab becomes visible
  // again, window regains focus), treat that as a strong signal that any cached
  // snapshot may be stale and re-fetch immediately. A 2s debounce via
  // lastRefreshAtRef prevents double-fetching when both events fire on resume.
  useEffect(() => {
    if (!tripId) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const maybeRefresh = () => {
      if (Date.now() - lastRefreshAtRef.current < 2_000) return;
      void refreshSnapshot();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };
    const handleFocus = () => {
      maybeRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [tripId, refreshSnapshot]);

  const setStopStatus = useCallback<UseOnTripMutationsResult["setStopStatus"]>(
    async (stopRef, nextStatus) => {
      if (!tripId) return;
      const requestId = ++requestIdRef.current;
      const previousOverride = optimistic.statusByRef[stopRef] ?? null;

      // Optimistic UI update is synchronous so the latest tap always wins
      // what the user sees; the network write below is serialized per-ref so
      // the server observes taps in submission order.
      setOptimistic((prev) => ({
        ...prev,
        statusByRef: {
          ...prev.statusByRef,
          [stopRef]: { kind: "pending", requestId, target: nextStatus },
        },
      }));
      setPendingCountByRef((prev) => ({
        ...prev,
        [stopRef]: (prev[stopRef] ?? 0) + 1,
      }));

      const performWrite = async () => {
        try {
          await postStopStatus(token, tripId, {
            stop_ref: stopRef,
            status: nextStatus,
          });
          setOptimistic((prev) => {
            const current = prev.statusByRef[stopRef];
            // A newer tap already replaced our pending entry — don't clobber
            // its optimistic state with our committed one.
            if (!current || current.requestId !== requestId) return prev;
            return {
              ...prev,
              statusByRef: {
                ...prev.statusByRef,
                [stopRef]: { kind: "committed", requestId, target: nextStatus },
              },
            };
          });
          await refreshSnapshot();
        } catch (error) {
          setOptimistic((prev) => {
            const nextMap = { ...prev.statusByRef };
            const current = nextMap[stopRef];
            // A newer tap has moved on — leave its optimistic state alone.
            if (current && current.requestId !== requestId) {
              return prev;
            }
            if (previousOverride) {
              nextMap[stopRef] = previousOverride;
            } else {
              delete nextMap[stopRef];
            }
            return { ...prev, statusByRef: nextMap };
          });
          setFeedback({
            kind: "error",
            message:
              error instanceof Error ? error.message : "Could not update status.",
            at: Date.now(),
          });
        }
      };

      const queue = statusQueueRef.current;
      const prior = queue.get(stopRef) ?? Promise.resolve();
      // `.then(fn, fn)` so a prior failure does NOT poison the chain and
      // block later taps from reaching the server.
      const thisRun = prior.then(performWrite, performWrite);
      queue.set(stopRef, thisRun);

      try {
        await thisRun;
      } finally {
        setPendingCountByRef((prev) => {
          const current = prev[stopRef] ?? 0;
          const nextCount = current - 1;
          const next = { ...prev };
          if (nextCount <= 0) delete next[stopRef];
          else next[stopRef] = nextCount;
          return next;
        });
        if (queue.get(stopRef) === thisRun) queue.delete(stopRef);
      }
    },
    [optimistic.statusByRef, refreshSnapshot, token, tripId],
  );

  const logUnplannedStop = useCallback<UseOnTripMutationsResult["logUnplannedStop"]>(
    async (payload) => {
      if (!tripId) return;
      setIsLoggingUnplanned(true);
      // We do not optimistically insert unplanned stops. The server assigns the
      // event_id, and showing a placeholder with no id would make delete-on-failure
      // ambiguous. The round-trip is quick; users see the entry after the POST.
      //
      // The client-side retry wrapper (`executeWithRetry`) will replay this
      // POST on a transient failure, so we attach a stable per-submission
      // idempotency token. The server collapses a replay onto the original
      // row instead of creating a duplicate — only generated here so callers
      // that pass an explicit id (tests, future external callers) can
      // override it.
      const clientRequestId =
        payload.client_request_id ?? generateClientRequestId();
      try {
        await postUnplannedStop(token, tripId, {
          ...payload,
          client_request_id: clientRequestId,
        });
        await refreshSnapshot();
      } catch (error) {
        setFeedback({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not log stop.",
          at: Date.now(),
        });
      } finally {
        setIsLoggingUnplanned(false);
      }
    },
    [refreshSnapshot, token, tripId],
  );

  const removeUnplannedStop = useCallback<UseOnTripMutationsResult["removeUnplannedStop"]>(
    async (eventId) => {
      if (!tripId) return;
      setOptimistic((prev) => ({
        ...prev,
        deletedUnplannedIds: { ...prev.deletedUnplannedIds, [eventId]: true },
      }));
      setUnplannedPendingIds((prev) => ({ ...prev, [eventId]: true }));
      try {
        await deleteExecutionEvent(token, tripId, eventId);
        await refreshSnapshot();
      } catch (error) {
        setOptimistic((prev) => {
          const nextMap = { ...prev.deletedUnplannedIds };
          delete nextMap[eventId];
          return { ...prev, deletedUnplannedIds: nextMap };
        });
        setFeedback({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not remove stop.",
          at: Date.now(),
        });
      } finally {
        setUnplannedPendingIds((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      }
    },
    [refreshSnapshot, token, tripId],
  );

  const viewSnapshot = useMemo<TripOnTripSnapshot | null>(() => {
    if (!snapshot) return null;
    const overrides = optimistic.statusByRef;
    const overriddenStops = snapshot.today_stops.map<TripOnTripStopSnapshot>((stop) => {
      const entry = stop.stop_ref ? overrides[stop.stop_ref] : undefined;
      return entry ? { ...stop, execution_status: entry.target } : stop;
    });
    const filteredUnplanned = snapshot.today_unplanned.filter(
      (item) => !optimistic.deletedUnplannedIds[item.event_id],
    );
    // Optimistic next_stop: apply the same eligibility rule the server uses
    // inside _pick_next_stop for individual stops — eligible iff the plan-level
    // status is not "skipped" AND the execution_status (possibly overridden by
    // an in-flight tap) is not "confirmed" / "skipped".
    //
    // This scan covers only today_stops. When nothing on today is eligible we
    // fall through to snapshot.next_stop, which is the server-computed value
    // and may point to a stop on a future day the client cannot evaluate.
    const optimisticNextStop =
      overriddenStops.find((stop) => {
        const planStatus = (stop.status ?? "planned").trim().toLowerCase();
        if (planStatus === "skipped") return false;
        const execStatus = stop.execution_status;
        if (execStatus === "confirmed" || execStatus === "skipped") return false;
        return true;
      }) ?? null;
    return {
      ...snapshot,
      today_stops: overriddenStops,
      today_unplanned: filteredUnplanned,
      next_stop: optimisticNextStop ?? snapshot.next_stop,
    };
  }, [snapshot, optimistic.statusByRef, optimistic.deletedUnplannedIds]);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  // Public pending map stays a Record<string, boolean> — consumers only need
  // to know whether a write is in flight for a given stop_ref. Derived from
  // the internal counter so two overlapping taps don't flicker the flag off.
  const statusPending = useMemo<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const [ref, count] of Object.entries(pendingCountByRef)) {
      if (count > 0) out[ref] = true;
    }
    return out;
  }, [pendingCountByRef]);

  return {
    viewSnapshot,
    statusPending,
    unplannedPendingIds,
    isLoggingUnplanned,
    feedback,
    dismissFeedback,
    setStopStatus,
    logUnplannedStop,
    removeUnplannedStop,
  };
}

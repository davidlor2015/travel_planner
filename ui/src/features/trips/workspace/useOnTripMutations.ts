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
} from "../../../shared/api/trips";

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

export function useOnTripMutations({
  token,
  tripId,
  snapshot,
  onSnapshotRefresh,
}: UseOnTripMutationsOptions): UseOnTripMutationsResult {
  const [optimistic, setOptimistic] = useState<OptimisticState>(emptyOptimisticState());
  const [statusPending, setStatusPending] = useState<Record<string, boolean>>({});
  const [unplannedPendingIds, setUnplannedPendingIds] = useState<Record<number, boolean>>({});
  const [isLoggingUnplanned, setIsLoggingUnplanned] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | null>(null);

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

        // committed: clear once server agrees; otherwise notify and clear
        if (serverStatus === entry.target) {
          continue;
        }

        setFeedback({
          kind: "success",
          message: `Synced: server shows ${serverStatus ?? "planned"}.`,
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
      setOptimistic((prev) => ({
        ...prev,
        statusByRef: {
          ...prev.statusByRef,
          [stopRef]: { kind: "pending", requestId, target: nextStatus },
        },
      }));
      setStatusPending((prev) => ({ ...prev, [stopRef]: true }));
      try {
        await postStopStatus(token, tripId, { stop_ref: stopRef, status: nextStatus });
        setOptimistic((prev) => {
          const current = prev.statusByRef[stopRef];
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
          message: error instanceof Error ? error.message : "Could not update status.",
          at: Date.now(),
        });
      } finally {
        setStatusPending((prev) => {
          const next = { ...prev };
          delete next[stopRef];
          return next;
        });
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
      try {
        await postUnplannedStop(token, tripId, payload);
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

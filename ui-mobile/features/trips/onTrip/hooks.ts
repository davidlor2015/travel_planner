import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { tripKeys } from "../hooks";

import {
  deleteExecutionEvent,
  getTripOnTripSnapshot,
  postStopStatus,
  postUnplannedStop,
} from "../api";
import type {
  TripExecutionStatus,
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
  UnplannedStopPayload,
} from "../types";

export type MutationFeedback = {
  kind: "error" | "success";
  message: string;
  at: number;
};

type OptimisticEntry =
  | { kind: "pending"; requestId: number; target: TripExecutionStatus }
  | { kind: "committed"; requestId: number; target: TripExecutionStatus };

type OptimisticState = {
  statusByRef: Record<string, OptimisticEntry>;
  deletedUnplannedIds: Record<number, true>;
};

const emptyOptimistic = (): OptimisticState => ({
  statusByRef: {},
  deletedUnplannedIds: {},
});

function generateClientRequestId(): string {
  const maybeUuid = globalThis.crypto?.randomUUID;
  if (typeof maybeUuid === "function") return maybeUuid.call(globalThis.crypto);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type UseOnTripMutationsOptions = {
  tripId: number | null;
  snapshot: TripOnTripSnapshot | null;
  onSnapshotRefresh: (snapshot: TripOnTripSnapshot) => void;
};

export type UseOnTripMutationsResult = {
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

export function useOnTripMutations({
  tripId,
  snapshot,
  onSnapshotRefresh,
}: UseOnTripMutationsOptions): UseOnTripMutationsResult {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<OptimisticState>(emptyOptimistic);
  const [pendingCountByRef, setPendingCountByRef] = useState<Record<string, number>>({});
  const [unplannedPendingIds, setUnplannedPendingIds] = useState<Record<number, boolean>>({});
  const [isLoggingUnplanned, setIsLoggingUnplanned] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | null>(null);

  const statusQueueRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const requestIdRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  // Clear stale overrides when the trip changes.
  const lastTripIdRef = useRef<number | null>(tripId);
  if (lastTripIdRef.current !== tripId) {
    lastTripIdRef.current = tripId;
    if (
      Object.keys(optimistic.statusByRef).length > 0 ||
      Object.keys(optimistic.deletedUnplannedIds).length > 0
    ) {
      setOptimistic(emptyOptimistic());
    }
  }

  const reconcileOptimistic = useCallback(
    (prev: OptimisticState, next: TripOnTripSnapshot): OptimisticState => {
      const nextMap: Record<string, OptimisticEntry> = {};
      for (const [stopRef, entry] of Object.entries(prev.statusByRef)) {
        if (entry.kind === "pending") {
          nextMap[stopRef] = entry;
          continue;
        }
        const server = next.today_stops.find((s) => s.stop_ref === stopRef);
        const serverStatus = server?.execution_status ?? null;
        if (serverStatus !== entry.target) {
          setFeedback({
            kind: "error",
            message: `Update was reverted by server (now: ${serverStatus ?? "planned"}).`,
            at: Date.now(),
          });
        }
      }
      return { ...prev, statusByRef: nextMap };
    },
    [],
  );

  const refreshSnapshot = useCallback(async () => {
    if (!tripId) return;
    try {
      const next = await getTripOnTripSnapshot(tripId);
      lastRefreshAtRef.current = Date.now();
      // Keep the React Query cache in sync so useOnTripSnapshotQuery
      // callers see the same data without issuing a separate fetch.
      queryClient.setQueryData(tripKeys.onTripSnapshot(tripId), next);
      onSnapshotRefresh(next);
      setOptimistic((prev) => reconcileOptimistic(prev, next));
    } catch {
      // Non-fatal: keep existing overrides.
    }
  }, [tripId, queryClient, onSnapshotRefresh, reconcileOptimistic]);

  // Background polling: every 30s when app is foregrounded.
  useEffect(() => {
    if (!tripId) return;
    const intervalId = setInterval(() => {
      if (Date.now() - lastRefreshAtRef.current >= 30_000) {
        void refreshSnapshot();
      }
    }, 30_000);
    return () => clearInterval(intervalId);
  }, [tripId, refreshSnapshot]);

  // Foreground refresh: re-fetch when the app comes back to the foreground.
  useEffect(() => {
    if (!tripId) return;
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && Date.now() - lastRefreshAtRef.current > 2_000) {
        void refreshSnapshot();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [tripId, refreshSnapshot]);

  const setStopStatus = useCallback(
    async (stopRef: string, nextStatus: TripExecutionStatus) => {
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
      setPendingCountByRef((prev) => ({
        ...prev,
        [stopRef]: (prev[stopRef] ?? 0) + 1,
      }));

      const performWrite = async () => {
        try {
          await postStopStatus(tripId, { stop_ref: stopRef, status: nextStatus });
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
        } catch (err) {
          setOptimistic((prev) => {
            const nextMap = { ...prev.statusByRef };
            const current = nextMap[stopRef];
            if (current && current.requestId !== requestId) return prev;
            if (previousOverride) {
              nextMap[stopRef] = previousOverride;
            } else {
              delete nextMap[stopRef];
            }
            return { ...prev, statusByRef: nextMap };
          });
          setFeedback({
            kind: "error",
            message: err instanceof Error ? err.message : "Could not update status.",
            at: Date.now(),
          });
        }
      };

      const queue = statusQueueRef.current;
      const prior = queue.get(stopRef) ?? Promise.resolve();
      const thisRun = prior.then(performWrite, performWrite);
      queue.set(stopRef, thisRun);

      try {
        await thisRun;
      } finally {
        setPendingCountByRef((prev) => {
          const count = (prev[stopRef] ?? 0) - 1;
          const next = { ...prev };
          if (count <= 0) delete next[stopRef];
          else next[stopRef] = count;
          return next;
        });
        if (queue.get(stopRef) === thisRun) queue.delete(stopRef);
      }
    },
    [optimistic.statusByRef, refreshSnapshot, tripId],
  );

  const logUnplannedStop = useCallback(
    async (payload: UnplannedStopPayload) => {
      if (!tripId) return;
      setIsLoggingUnplanned(true);
      const clientRequestId = payload.client_request_id ?? generateClientRequestId();
      try {
        await postUnplannedStop(tripId, { ...payload, client_request_id: clientRequestId });
        await refreshSnapshot();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not log stop.",
          at: Date.now(),
        });
      } finally {
        setIsLoggingUnplanned(false);
      }
    },
    [tripId, refreshSnapshot],
  );

  const removeUnplannedStop = useCallback(
    async (eventId: number) => {
      if (!tripId) return;
      setOptimistic((prev) => ({
        ...prev,
        deletedUnplannedIds: { ...prev.deletedUnplannedIds, [eventId]: true },
      }));
      setUnplannedPendingIds((prev) => ({ ...prev, [eventId]: true }));
      try {
        await deleteExecutionEvent(tripId, eventId);
        await refreshSnapshot();
      } catch (err) {
        setOptimistic((prev) => {
          const next = { ...prev.deletedUnplannedIds };
          delete next[eventId];
          return { ...prev, deletedUnplannedIds: next };
        });
        setFeedback({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not remove stop.",
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
    [tripId, refreshSnapshot],
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

  const statusPending = useMemo<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const [ref, count] of Object.entries(pendingCountByRef)) {
      if (count > 0) out[ref] = true;
    }
    return out;
  }, [pendingCountByRef]);

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

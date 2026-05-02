// Path: ui-mobile/features/trips/onTrip/hooks.ts
// Summary: Implements hooks module logic.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/client";

import { tripKeys } from "../hooks";

import {
  deleteExecutionEvent,
  getTripOnTripSnapshot,
  postStopStatus,
  postUnplannedStop,
} from "../api";
import { patchOnTripSnapshotCacheStopStatus } from "./cache";
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
  | {
      kind: "pending";
      requestId: number;
      target: TripExecutionStatus;
      actor: OptimisticActor;
      updatedAt: string;
    }
  | {
      kind: "committed";
      requestId: number;
      target: TripExecutionStatus;
      actor: OptimisticActor;
      updatedAt: string;
    };

type OptimisticActor = {
  userId: number | null;
  displayName: string | null;
  email: string | null;
};

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

// Traveler-facing copy; intentionally avoids HTTP codes, server payloads, and
// field-level error strings so nothing leaks technical language into the UI.
export function toFriendlyOnTripError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "You don't have access to update this trip right now.";
    }
    if (err.status === 404) {
      return "That stop is no longer on this trip.";
    }
    if (err.status === 409) {
      return "Someone else just updated this. We refreshed it — try again.";
    }
    if (err.status >= 500) {
      return "We couldn't reach the server. Try again in a moment.";
    }
  }
  return fallback;
}

// Polling cadence matches the web OnTripCompactMode: fast when the user has
// interacted recently, slower when idle so background battery is reasonable.
const ACTIVE_POLL_MS = 20_000;
const IDLE_POLL_MS = 60_000;
const ACTIVE_WINDOW_MS = 60_000;
const FOREGROUND_REFRESH_DEBOUNCE_MS = 2_000;

export type UseOnTripMutationsOptions = {
  tripId: number | null;
  snapshot: TripOnTripSnapshot | null;
  onSnapshotRefresh: (snapshot: TripOnTripSnapshot) => void;
  currentUser?: {
    id?: number | null;
    email?: string | null;
    display_name?: string | null;
  } | null;
};

export type UseOnTripMutationsResult = {
  viewSnapshot: TripOnTripSnapshot | null;
  statusPending: Record<string, boolean>;
  unplannedPendingIds: Record<number, boolean>;
  isLoggingUnplanned: boolean;
  feedback: MutationFeedback | null;
  dismissFeedback: () => void;
  setStopStatus: (
    stopRef: string,
    nextStatus: TripExecutionStatus,
  ) => Promise<void>;
  logUnplannedStop: (payload: UnplannedStopPayload) => Promise<void>;
  removeUnplannedStop: (eventId: number) => Promise<void>;
  lastRefreshedAt: number;
  refreshFailed: boolean;
};

export function useOnTripMutations({
  tripId,
  snapshot,
  onSnapshotRefresh,
  currentUser = null,
}: UseOnTripMutationsOptions): UseOnTripMutationsResult {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] =
    useState<OptimisticState>(emptyOptimistic);
  const [pendingCountByRef, setPendingCountByRef] = useState<
    Record<string, number>
  >({});
  const [unplannedPendingIds, setUnplannedPendingIds] = useState<
    Record<number, boolean>
  >({});
  const [isLoggingUnplanned, setIsLoggingUnplanned] = useState(false);
  const [feedback, setFeedback] = useState<MutationFeedback | null>(null);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusQueueRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const requestIdRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const lastInteractionAtRef = useRef(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);

  // Auto-dismiss the feedback toast after 3 seconds so the user doesn't have
  // to tap it away after every confirm/skip.
  useEffect(() => {
    if (!feedback) return;
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 3000);
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [feedback]);

  const markInteraction = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
  }, []);

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
            message: "That update was reverted. Try again.",
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
      const now = Date.now();
      lastRefreshAtRef.current = now;
      setLastRefreshedAt(now);
      setRefreshFailed(false);
      queryClient.setQueryData(tripKeys.onTripSnapshot(tripId), next);
      onSnapshotRefresh(next);
      setOptimistic((prev) => reconcileOptimistic(prev, next));
    } catch {
      setRefreshFailed(true);
    }
  }, [tripId, queryClient, onSnapshotRefresh, reconcileOptimistic]);

  // Adaptive polling: the interval always ticks every ACTIVE_POLL_MS so we pick
  // up recent user activity promptly, but a refetch only fires if the last
  // refresh is older than the window that matches the user's current state
  // (active vs idle). This mirrors the web compact-mode cadence.
  useEffect(() => {
    if (!tripId) return;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const isActive = now - lastInteractionAtRef.current < ACTIVE_WINDOW_MS;
      const threshold = isActive ? ACTIVE_POLL_MS : IDLE_POLL_MS;
      if (now - lastRefreshAtRef.current >= threshold) {
        void refreshSnapshot();
      }
    }, ACTIVE_POLL_MS);
    return () => clearInterval(intervalId);
  }, [tripId, refreshSnapshot]);

  // Foreground refresh: re-fetch when the app comes back to the foreground,
  // debounced so brief focus blips don't spam the backend.
  useEffect(() => {
    if (!tripId) return;
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        nextState === "active" &&
        Date.now() - lastRefreshAtRef.current > FOREGROUND_REFRESH_DEBOUNCE_MS
      ) {
        void refreshSnapshot();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [tripId, refreshSnapshot]);

  const setStopStatus = useCallback(
    async (stopRef: string, nextStatus: TripExecutionStatus) => {
      if (!tripId) return;
      markInteraction();
      const requestId = ++requestIdRef.current;
      const previousOverride = optimistic.statusByRef[stopRef] ?? null;
      const actor = buildOptimisticActor(currentUser);
      const updatedAt = new Date().toISOString();

      setOptimistic((prev) => ({
        ...prev,
        statusByRef: {
          ...prev.statusByRef,
          [stopRef]: {
            kind: "pending",
            requestId,
            target: nextStatus,
            actor,
            updatedAt,
          },
        },
      }));
      setPendingCountByRef((prev) => ({
        ...prev,
        [stopRef]: (prev[stopRef] ?? 0) + 1,
      }));

      const performWrite = async () => {
        try {
          await postStopStatus(tripId, {
            stop_ref: stopRef,
            status: nextStatus,
          });
          setOptimistic((prev) => {
            const current = prev.statusByRef[stopRef];
            if (!current || current.requestId !== requestId) return prev;
            return {
              ...prev,
              statusByRef: {
                ...prev.statusByRef,
                [stopRef]: {
                  kind: "committed",
                  requestId,
                  target: nextStatus,
                  actor,
                  updatedAt,
                },
              },
            };
          });
          if (nextStatus === "confirmed") {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          } else if (nextStatus === "skipped") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          await patchOnTripSnapshotCacheStopStatus(tripId, {
            stopRef,
            status: nextStatus,
            actor,
            updatedAt,
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
            message: toFriendlyOnTripError(
              err,
              "Couldn't save that update. Check your connection and try again.",
            ),
            at: Date.now(),
          });
        }
      };

      // Serialize writes per stop_ref so rapid taps land in order and the final
      // server state matches the final tap.
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
    [currentUser, optimistic.statusByRef, refreshSnapshot, tripId, markInteraction],
  );

  const logUnplannedStop = useCallback(
    async (payload: UnplannedStopPayload) => {
      if (!tripId) return;
      markInteraction();
      setIsLoggingUnplanned(true);
      const clientRequestId =
        payload.client_request_id ?? generateClientRequestId();
      try {
        await postUnplannedStop(tripId, {
          ...payload,
          client_request_id: clientRequestId,
        });
        await refreshSnapshot();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: toFriendlyOnTripError(
            err,
            "Couldn't log that stop. Try again.",
          ),
          at: Date.now(),
        });
      } finally {
        setIsLoggingUnplanned(false);
      }
    },
    [tripId, refreshSnapshot, markInteraction],
  );

  const removeUnplannedStop = useCallback(
    async (eventId: number) => {
      if (!tripId) return;
      markInteraction();
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
          message: toFriendlyOnTripError(
            err,
            "Couldn't remove that stop. Try again.",
          ),
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
    [tripId, refreshSnapshot, markInteraction],
  );

  const viewSnapshot = useMemo<TripOnTripSnapshot | null>(() => {
    if (!snapshot) return null;
    const overrides = optimistic.statusByRef;
    const overriddenStops = snapshot.today_stops.map<TripOnTripStopSnapshot>(
      (stop) => {
        const entry = stop.stop_ref ? overrides[stop.stop_ref] : undefined;
        return entry
          ? {
              ...stop,
              execution_status: entry.target,
              status_updated_by_user_id: entry.actor.userId,
              status_updated_by_display_name: entry.actor.displayName,
              status_updated_by_email: entry.actor.email,
              status_updated_at: entry.updatedAt,
            }
          : stop;
      },
    );
    const filteredUnplanned = snapshot.today_unplanned.filter(
      (item) => !optimistic.deletedUnplannedIds[item.event_id],
    );
    // Keep "next stop" honest under optimistic state: if the user just
    // confirmed/skipped the server's next_stop, pick the first remaining
    // planned stop so the UI doesn't keep surfacing a completed stop.
    const optimisticNextStop =
      overriddenStops.find((stop) => {
        const planStatus = (stop.status ?? "planned").trim().toLowerCase();
        if (planStatus === "skipped") return false;
        const execStatus = stop.execution_status;
        if (execStatus === "confirmed" || execStatus === "skipped")
          return false;
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
    lastRefreshedAt,
    refreshFailed,
  };
}

function buildOptimisticActor(
  currentUser: UseOnTripMutationsOptions["currentUser"],
): OptimisticActor {
  if (!currentUser) {
    return { userId: null, displayName: "you", email: null };
  }
  return {
    userId:
      typeof currentUser.id === "number" ? currentUser.id : null,
    displayName: "you",
    email: currentUser.email ?? null,
  };
}

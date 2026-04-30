// Path: ui-mobile/features/trips/hooks.ts
// Summary: Implements hooks module logic.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptPendingTripInvite,
  createTrip,
  createTripInvite,
  declinePendingTripInvite,
  deleteTrip,
  getPendingTripInvites,
  getTripById,
  getTripExecutionSummary,
  getTripMemberReadiness,
  getTripOnTripSnapshot,
  getTripSummaries,
  getTrips,
  updateTrip,
} from "./api";
import type { TripCreate, TripResponse, TripSummary, TripUpdate } from "./types";
import {
  type OnTripSnapshotCacheRecord,
  readOnTripSnapshotCache,
  writeOnTripSnapshotCache,
} from "./onTrip/cache";

export const tripKeys = {
  all: ["trips"] as const,
  pendingInvites: ["trip-invites", "pending"] as const,
  detail: (tripId: number) => ["trips", tripId] as const,
  executionSummary: (tripId: number) =>
    ["trips", tripId, "execution-summary"] as const,
  summaries: ["trips", "summaries"] as const,
  memberReadiness: (tripId: number) => ["trips", tripId, "readiness"] as const,
  onTripSnapshot: (tripId: number) => ["trips", tripId, "on-trip-snapshot"] as const,
};

export function useTripsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () => getTrips(),
    enabled: options?.enabled ?? true,
  });
}

export function useTripDetailQuery(
  tripId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: tripKeys.detail(tripId as number),
    queryFn: () => getTripById(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
  });
}

export function useTripSummariesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tripKeys.summaries,
    queryFn: getTripSummaries,
    enabled: options?.enabled ?? true,
  });
}

export function usePendingTripInvitesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tripKeys.pendingInvites,
    queryFn: getPendingTripInvites,
    enabled: options?.enabled ?? true,
  });
}

export function useTripExecutionSummaryQuery(
  tripId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: tripKeys.executionSummary(tripId as number),
    queryFn: () => getTripExecutionSummary(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
  });
}

export function useTripMemberReadinessQuery(
  tripId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: tripKeys.memberReadiness(tripId as number),
    queryFn: () => getTripMemberReadiness(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
  });
}

export function useOnTripSnapshotQuery(
  tripId: number | null,
  options?: { enabled?: boolean },
) {
  const [cachedRecord, setCachedRecord] =
    useState<OnTripSnapshotCacheRecord | null>(null);

  useEffect(() => {
    setCachedRecord(null);
    if (typeof tripId !== "number") return;
    let cancelled = false;
    void readOnTripSnapshotCache(tripId).then((record) => {
      if (!cancelled) setCachedRecord(record);
    });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const query = useQuery({
    queryKey: tripKeys.onTripSnapshot(tripId as number),
    queryFn: () => getTripOnTripSnapshot(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (typeof tripId !== "number" || !query.data) return;
    void writeOnTripSnapshotCache(tripId, query.data).then((record) => {
      if (record) setCachedRecord(record);
    });
  }, [tripId, query.data]);

  const mergedData = useMemo(
    () => query.data ?? cachedRecord?.snapshot,
    [query.data, cachedRecord?.snapshot],
  );

  const dataUpdatedAt = query.data
    ? query.dataUpdatedAt
    : cachedRecord?.savedAt ?? 0;

  const hasCachedData = !query.data && !!cachedRecord?.snapshot;
  const refreshFailedWithCache = query.isError && !!mergedData;

  return {
    ...query,
    data: mergedData,
    isLoading: query.isLoading && !mergedData,
    isError: query.isError && !mergedData,
    hasCachedData,
    refreshFailedWithCache,
    dataUpdatedAt,
  };
}

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TripCreate) => createTrip(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: TripUpdate }) =>
      updateTrip(tripId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(tripKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useDeleteTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: number) => deleteTrip(tripId),
    onMutate: async (tripId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: tripKeys.detail(tripId) }),
        queryClient.cancelQueries({ queryKey: tripKeys.executionSummary(tripId) }),
        queryClient.cancelQueries({ queryKey: tripKeys.memberReadiness(tripId) }),
        queryClient.cancelQueries({ queryKey: tripKeys.onTripSnapshot(tripId) }),
        queryClient.cancelQueries({ queryKey: tripKeys.all }),
        queryClient.cancelQueries({ queryKey: tripKeys.summaries }),
      ]);
    },
    onSuccess: (_data, tripId) => {
      queryClient.setQueryData<TripResponse[]>(tripKeys.all, (current) =>
        current?.filter((trip) => trip.id !== tripId),
      );
      queryClient.setQueryData<TripSummary[]>(tripKeys.summaries, (current) =>
        current?.filter((summary) => summary.trip_id !== tripId),
      );
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.removeQueries({ queryKey: tripKeys.executionSummary(tripId) });
      queryClient.removeQueries({ queryKey: tripKeys.memberReadiness(tripId) });
      queryClient.removeQueries({ queryKey: tripKeys.onTripSnapshot(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
      void queryClient.invalidateQueries({ queryKey: tripKeys.summaries });
    },
  });
}

export function useCreateInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, email }: { tripId: number; email: string }) =>
      createTripInvite(tripId, email),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useAcceptPendingInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => acceptPendingTripInvite(inviteId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.pendingInvites });
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
      void queryClient.invalidateQueries({ queryKey: tripKeys.summaries });
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(result.trip_id) });
    },
  });
}

export function useDeclinePendingInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => declinePendingTripInvite(inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.pendingInvites });
    },
  });
}

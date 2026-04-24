import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTrip,
  createTripInvite,
  deleteTrip,
  getTripById,
  getTripMemberReadiness,
  getTripOnTripSnapshot,
  getTripSummaries,
  getTrips,
  updateTrip,
} from "./api";
import type { TripCreate, TripUpdate } from "./types";

export const tripKeys = {
  all: ["trips"] as const,
  detail: (tripId: number) => ["trips", tripId] as const,
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
  return useQuery({
    queryKey: tripKeys.onTripSnapshot(tripId as number),
    queryFn: () => getTripOnTripSnapshot(tripId as number),
    enabled: (options?.enabled ?? true) && typeof tripId === "number",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
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
    onSuccess: (_data, tripId) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
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

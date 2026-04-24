import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  closeMatchRequest,
  getMatchRequests,
  getMatchingProfile,
  getMatches,
  openMatchRequest,
  updateMatchInteraction,
  upsertMatchingProfile,
  type MatchInteractionStatus,
  type TravelProfilePayload,
} from "./api";

const matchingKeys = {
  profile: ["matching", "profile"] as const,
  requests: ["matching", "requests"] as const,
  results: (requestId: number) => ["matching", "requests", requestId, "results"] as const,
};

export function useMatchingProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: matchingKeys.profile,
    queryFn: getMatchingProfile,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useMatchRequestsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: matchingKeys.requests,
    queryFn: getMatchRequests,
    enabled: options?.enabled ?? true,
  });
}

export function useMatchResultsQuery(
  requestId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: matchingKeys.results(requestId as number),
    queryFn: () => getMatches(requestId as number),
    enabled: (options?.enabled ?? true) && typeof requestId === "number",
  });
}

export function useUpsertMatchingProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TravelProfilePayload) => upsertMatchingProfile(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(matchingKeys.profile, profile);
    },
  });
}

export function useOpenMatchRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: number) => openMatchRequest(tripId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingKeys.requests });
    },
  });
}

export function useCloseMatchRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => closeMatchRequest(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingKeys.requests });
    },
  });
}

export function useUpdateMatchInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      matchResultId,
      data,
    }: {
      requestId: number;
      matchResultId: number;
      data: { status: MatchInteractionStatus; note?: string | null };
    }) => updateMatchInteraction(requestId, matchResultId, data),
    onSuccess: (_result, { requestId }) => {
      void queryClient.invalidateQueries({ queryKey: matchingKeys.results(requestId) });
    },
  });
}

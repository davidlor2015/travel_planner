// Path: ui-mobile/features/trips/workspace/hooks.ts
// Summary: Implements hooks module logic.

import { useCallback, useMemo } from "react";

import {
  useCreateInviteMutation,
  useTripMemberReadinessQuery,
} from "@/features/trips/hooks";

import { toTripWorkspaceCollaborationViewModel } from "./adapters";

import type { TripResponse } from "../types";

export function useWorkspaceCollaboration(
  tripId: number | null,
  trip: TripResponse | null,
  currentUserEmail: string,
) {
  const memberReadinessQuery = useTripMemberReadinessQuery(tripId, {
    enabled: Boolean(trip),
  });
  const createInviteMutation = useCreateInviteMutation();

  const collaboration = useMemo(
    () =>
      trip
        ? toTripWorkspaceCollaborationViewModel({
            trip,
            currentUserEmail,
            readiness: memberReadinessQuery.data ?? null,
            readinessLoading: memberReadinessQuery.isLoading,
          })
        : null,
    [currentUserEmail, memberReadinessQuery.data, memberReadinessQuery.isLoading, trip],
  );

  const sendInvite = useCallback(
    async (email: string) => {
      if (typeof tripId !== "number") {
        throw new Error("Trip is not ready yet.");
      }
      return createInviteMutation.mutateAsync({
        tripId,
        email,
      });
    },
    [createInviteMutation, tripId],
  );

  return {
    collaboration,
    sendInvite,
    isSendingInvite: createInviteMutation.isPending,
    memberReadinessError: memberReadinessQuery.isError
      ? "We couldn't load traveler readiness right now."
      : null,
  };
}

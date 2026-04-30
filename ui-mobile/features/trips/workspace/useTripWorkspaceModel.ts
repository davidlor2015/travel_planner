// Path: ui-mobile/features/trips/workspace/useTripWorkspaceModel.ts
// Summary: Provides useTripWorkspaceModel hook behavior.

import { useMemo } from "react";

import {
  useCreateTripMutation,
  useDeleteTripMutation,
  useTripDetailQuery,
  useTripsQuery,
  useTripSummariesQuery,
  useUpdateTripMutation,
} from "@/features/trips/hooks";
import { toTripListItem } from "@/features/trips/adapters";
import {
  buildCreateTripPayload,
  buildTripUpdatePayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { ApiError } from "@/shared/api/client";

import { toTripSummaryViewModel, toTripWorkspaceViewModel } from "./adapters";
import { useWorkspaceCollaboration } from "./hooks";

type Options = {
  tripId: number;
  currentUserEmail: string;
  currentUserId?: number | null;
  currentUserDisplayName?: string | null;
};

export type TripWorkspaceModel = {
  tripQuery: ReturnType<typeof useTripDetailQuery>;
  tripRaw: ReturnType<typeof useTripDetailQuery>["data"] | null;
  trip: ReturnType<typeof toTripWorkspaceViewModel> | null;
  summary: ReturnType<typeof toTripSummaryViewModel> | null;
  collaboration: ReturnType<typeof useWorkspaceCollaboration>["collaboration"];
  memberReadinessError: ReturnType<typeof useWorkspaceCollaboration>["memberReadinessError"];
  invitePending: ReturnType<typeof useWorkspaceCollaboration>["isSendingInvite"];
  onInvite: ReturnType<typeof useWorkspaceCollaboration>["sendInvite"];
  switcherTrips: ReturnType<typeof toTripListItem>[];
  isCreatingTrip: boolean;
  isUpdatingTrip: boolean;
  isDeletingTrip: boolean;
  createTrip: (value: TripFormValue) => Promise<{ id: number }>;
  updateTrip: (value: TripFormValue) => Promise<unknown>;
  deleteTrip: () => Promise<void>;
  isSolo: boolean;
  showGroupCoordination: boolean;
  isNotFound: boolean;
};

export function useTripWorkspaceModel({
  tripId,
  currentUserEmail,
  currentUserId,
  currentUserDisplayName,
}: Options): TripWorkspaceModel {
  // Queries and mutations
  const tripQuery = useTripDetailQuery(tripId);
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();
  const createTripMutation = useCreateTripMutation();
  const updateTripMutation = useUpdateTripMutation();
  const deleteTripMutation = useDeleteTripMutation();
  const collaborationQuery = useWorkspaceCollaboration(
    tripId,
    tripQuery.data ?? null,
    currentUserEmail,
    currentUserDisplayName,
  );

  // Primary view model derivations
  const isNotFound =
    tripQuery.isError &&
    tripQuery.error instanceof ApiError &&
    tripQuery.error.status === 404;

  const trip = useMemo(
    () =>
      tripQuery.data
        ? toTripWorkspaceViewModel(tripQuery.data, currentUserEmail, currentUserId)
        : null,
    [tripQuery.data, currentUserEmail, currentUserId],
  );

  const summary = useMemo(() => {
    const raw = summariesQuery.data?.find((item) => item.trip_id === tripId);
    return raw ? toTripSummaryViewModel(raw) : null;
  }, [summariesQuery.data, tripId]);

  const switcherTrips = useMemo(() => {
    const summariesById = new Map(
      (summariesQuery.data ?? []).map((item) => [item.trip_id, item]),
    );
    return (tripsQuery.data ?? []).map((trip) =>
      toTripListItem(trip, summariesById.get(trip.id)),
    );
  }, [tripsQuery.data, summariesQuery.data]);

  // Adaptive display flags
  const isSolo = (trip?.memberCount ?? 1) <= 1;
  const showGroupCoordination = !isSolo;

  // Action handlers
  const createTrip = async (value: TripFormValue) => {
    return createTripMutation.mutateAsync(buildCreateTripPayload(value));
  };

  const updateTrip = async (value: TripFormValue) => {
    return updateTripMutation.mutateAsync({
      tripId,
      data: buildTripUpdatePayload(value),
    });
  };

  const deleteTrip = async () => {
    await deleteTripMutation.mutateAsync(tripId);
  };

  return {
    tripQuery,
    tripRaw: tripQuery.data ?? null,
    trip,
    summary,
    collaboration: collaborationQuery.collaboration,
    memberReadinessError: collaborationQuery.memberReadinessError,
    invitePending: collaborationQuery.isSendingInvite,
    onInvite: collaborationQuery.sendInvite,
    switcherTrips,
    isCreatingTrip: createTripMutation.isPending,
    isUpdatingTrip: updateTripMutation.isPending,
    isDeletingTrip: deleteTripMutation.isPending,
    createTrip,
    updateTrip,
    deleteTrip,
    isSolo,
    showGroupCoordination,
    isNotFound,
  };
}

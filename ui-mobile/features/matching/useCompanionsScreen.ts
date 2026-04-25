import { useCallback, useEffect, useMemo, useState } from "react";

import { useTripsQuery } from "../trips/hooks";
import {
  useCloseMatchRequestMutation,
  useMatchRequestsQuery,
  useMatchingProfileQuery,
  useOpenMatchRequestMutation,
  useUpsertMatchingProfileMutation,
} from "./hooks";
import type { MatchRequest, TravelProfile, TravelProfilePayload } from "./api";
import type { TripResponse } from "../trips/types";

export type UseCompanionsScreenResult = {
  // Data
  profile: TravelProfile | null;
  requests: MatchRequest[];
  tripsById: Map<number, TripResponse>;
  eligibleTrips: TripResponse[];
  selectedTripId: number | null;
  setSelectedTripId: (tripId: number | null) => void;
  openRequestCount: number;
  closedRequestCount: number;

  // Loading / error
  profileIsLoading: boolean;
  requestsIsLoading: boolean;
  tripsIsLoading: boolean;
  profileError: string | null;
  requestsError: string | null;
  tripsError: string | null;

  // Edit-profile UI state
  isEditingProfile: boolean;
  setIsEditingProfile: (v: boolean) => void;

  // Actions
  handleUpsertProfile: (data: TravelProfilePayload) => Promise<void>;
  handleOpenRequest: (tripId: number) => Promise<void>;
  handleCloseRequest: (requestId: number) => void;
  isSavingProfile: boolean;
  isOpeningRequest: boolean;
  isClosingRequest: boolean;
  upsertError: string | null;
  openRequestError: string | null;
};

export function useCompanionsScreen(): UseCompanionsScreenResult {
  const profileQuery = useMatchingProfileQuery();
  const requestsQuery = useMatchRequestsQuery({ enabled: Boolean(profileQuery.data) });
  const tripsQuery = useTripsQuery();

  const upsertMutation = useUpsertMatchingProfileMutation();
  const openRequestMutation = useOpenMatchRequestMutation();
  const closeRequestMutation = useCloseMatchRequestMutation();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const profile = profileQuery.data ?? null;
  const requests = requestsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];

  const tripsById = useMemo(
    () => new Map(trips.map((t) => [t.id, t])),
    [trips],
  );

  const openRequestTripIds = useMemo(
    () => new Set(requests.filter((r) => r.status === "open").map((r) => r.trip_id)),
    [requests],
  );

  const openRequestCount = useMemo(
    () => requests.filter((request) => request.status === "open").length,
    [requests],
  );
  const closedRequestCount = requests.length - openRequestCount;

  const eligibleTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trips.filter((t) => {
      const end = new Date(t.end_date);
      return !openRequestTripIds.has(t.id) && today <= end;
    });
  }, [trips, openRequestTripIds]);

  useEffect(() => {
    if (selectedTripId === null) return;
    if (!eligibleTrips.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId(null);
    }
  }, [eligibleTrips, selectedTripId]);

  const handleUpsertProfile = async (data: TravelProfilePayload): Promise<void> => {
    await upsertMutation.mutateAsync(data);
    setIsEditingProfile(false);
  };

  const handleOpenRequest = useCallback(async (tripId: number): Promise<void> => {
    await openRequestMutation.mutateAsync(tripId);
    setSelectedTripId(null);
  }, [openRequestMutation]);

  const handleCloseRequest = useCallback((requestId: number): void => {
    closeRequestMutation.mutate(requestId);
  }, [closeRequestMutation]);

  return {
    profile,
    requests,
    tripsById,
    eligibleTrips,
    selectedTripId,
    setSelectedTripId,
    openRequestCount,
    closedRequestCount,
    profileIsLoading: profileQuery.isLoading,
    requestsIsLoading: requestsQuery.isLoading,
    tripsIsLoading: tripsQuery.isLoading,
    profileError: profileQuery.error ? String(profileQuery.error) : null,
    requestsError: requestsQuery.error ? String(requestsQuery.error) : null,
    tripsError: tripsQuery.error ? String(tripsQuery.error) : null,
    isEditingProfile,
    setIsEditingProfile,
    handleUpsertProfile,
    handleOpenRequest,
    handleCloseRequest,
    isSavingProfile: upsertMutation.isPending,
    isOpeningRequest: openRequestMutation.isPending,
    isClosingRequest: closeRequestMutation.isPending,
    upsertError: upsertMutation.error ? String(upsertMutation.error) : null,
    openRequestError: openRequestMutation.error ? String(openRequestMutation.error) : null,
  };
}

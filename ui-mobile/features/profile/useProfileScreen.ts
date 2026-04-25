import { useMemo } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { toTripListItem } from "../trips/adapters";
import { useTripsQuery, useTripSummariesQuery } from "../trips/hooks";
import { computeTravelStats, type TravelStats } from "./profileUtils";

export type UseProfileScreenResult = {
  displayName: string;
  email: string;
  stats: TravelStats;
  isLoadingStats: boolean;
  signOut: () => Promise<void>;
};

function fallbackDisplayName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function useProfileScreen(): UseProfileScreenResult {
  const { user, signOut } = useAuth();
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();

  const email = user?.email ?? "";
  const displayName =
    user?.display_name?.trim() ||
    (email ? fallbackDisplayName(email) : "Traveler");

  const stats = useMemo(() => {
    const summariesById = new Map(
      (summariesQuery.data ?? []).map((s) => [s.trip_id, s]),
    );
    const viewModels = (tripsQuery.data ?? []).map((t) =>
      toTripListItem(t, summariesById.get(t.id)),
    );
    return computeTravelStats(viewModels);
  }, [tripsQuery.data, summariesQuery.data]);

  return {
    displayName,
    email,
    stats,
    isLoadingStats: tripsQuery.isLoading,
    signOut,
  };
}

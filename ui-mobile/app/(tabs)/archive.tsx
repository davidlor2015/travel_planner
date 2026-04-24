import { useMemo } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";

import { TripCard } from "@/features/trips/TripCard";
import { toTripListItem } from "@/features/trips/adapters";
import { useTripsQuery, useTripSummariesQuery } from "@/features/trips/hooks";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

export default function ArchivePage() {
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();

  const pastTrips = useMemo(() => {
    const summariesById = new Map(
      (summariesQuery.data ?? []).map((s) => [s.trip_id, s]),
    );
    return (tripsQuery.data ?? [])
      .map((trip) => toTripListItem(trip, summariesById.get(trip.id)))
      .filter((t) => t.status === "past")
      .sort((a, b) => b.dateRange.localeCompare(a.dateRange));
  }, [tripsQuery.data, summariesQuery.data]);

  if (tripsQuery.isLoading) {
    return <ScreenLoading label="Loading your trips…" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 py-3">
        <ScreenHeader
          title="Archive"
          subtitle="Past trips and places you've been."
        />
      </View>

      {pastTrips.length === 0 ? (
        <View className="flex-1 px-4">
          <EmptyState
            title="No past trips yet"
            message="Completed trips show up here after their end date. Plan your first trip to get started."
          />
        </View>
      ) : (
        <FlatList
          contentContainerClassName="gap-3 px-4 pb-8"
          data={pastTrips}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => router.push(`/(tabs)/trips/${item.id}` as Href)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

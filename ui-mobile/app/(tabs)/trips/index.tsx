import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";

import { TripCard } from "@/features/trips/TripCard";
import {
  TripFormSheet,
  buildCreateTripPayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { toTripListItem } from "@/features/trips/adapters";
import { useCreateTripMutation, useTripsQuery } from "@/features/trips/hooks";
import { ApiError } from "@/shared/api/client";
import { PrimaryButton } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

export default function TripsPage() {
  const tripsQuery = useTripsQuery();
  const createTripMutation = useCreateTripMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tripItems = useMemo(
    () => (tripsQuery.data ?? []).map(toTripListItem),
    [tripsQuery.data],
  );

  if (tripsQuery.isLoading) {
    return <ScreenLoading label="Loading trips…" />;
  }

  if (tripsQuery.isError) {
    const message =
      tripsQuery.error instanceof ApiError
        ? tripsQuery.error.message
        : "Failed to load trips.";
    return <ScreenError message={message} onRetry={() => void tripsQuery.refetch()} />;
  }

  if (tripItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 gap-6 px-4 py-3">
          <ScreenHeader
            title="Trips"
            subtitle="Create a trip, then manage the workspace from here."
          />
          <EmptyState
            title="No trips yet"
            message="Start with destination and dates. The workspace, itinerary, and logistics all hang off the same trip record."
            action={<PrimaryButton label="Create Trip" onPress={() => setCreateOpen(true)} />}
          />
          <TripFormSheet
            visible={createOpen}
            mode="create"
            submitting={createTripMutation.isPending}
            error={createError}
            onClose={() => {
              setCreateOpen(false);
              setCreateError(null);
            }}
            onSubmit={async (value: TripFormValue) => {
              try {
                setCreateError(null);
                const created = await createTripMutation.mutateAsync(buildCreateTripPayload(value));
                setCreateOpen(false);
                router.push(`/(tabs)/trips/${created.id}` as Href);
              } catch (error) {
                setCreateError(
                  error instanceof Error ? error.message : "Could not create trip.",
                );
              }
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 py-3">
        <ScreenHeader
          title="Trips"
          subtitle="Open an existing workspace or start a new trip."
          rightAction={<PrimaryButton label="New Trip" onPress={() => setCreateOpen(true)} />}
        />
      </View>
      <FlatList
        contentContainerClassName="gap-3 px-4 pb-8"
        data={tripItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => router.push(`/(tabs)/trips/${item.id}` as Href)}
          />
        )}
      />
      <TripFormSheet
        visible={createOpen}
        mode="create"
        submitting={createTripMutation.isPending}
        error={createError}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          try {
            setCreateError(null);
            const created = await createTripMutation.mutateAsync(buildCreateTripPayload(value));
            setCreateOpen(false);
            router.push(`/(tabs)/trips/${created.id}` as Href);
          } catch (error) {
            setCreateError(error instanceof Error ? error.message : "Could not create trip.");
          }
        }}
      />
    </SafeAreaView>
  );
}

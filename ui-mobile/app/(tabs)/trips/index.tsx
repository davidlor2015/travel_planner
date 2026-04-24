import { Ionicons } from "@expo/vector-icons";
import { useQueries } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";

import { TripCard } from "@/features/trips/TripCard";
import {
  TripFormSheet,
  buildCreateTripPayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { TripSwitcherSheet } from "@/features/trips/TripSwitcherSheet";
import { toTripListItem } from "@/features/trips/adapters";
import {
  tripKeys,
  useCreateTripMutation,
  useTripSummariesQuery,
  useTripsQuery,
} from "@/features/trips/hooks";
import { getTripOnTripSnapshot } from "@/features/trips/api";
import { canOpenOnTrip } from "@/features/trips/onTrip/eligibility";
import type { TripOnTripSnapshot, TripSummary } from "@/features/trips/types";
import { getTripImageUrl } from "@/features/trips/workspace/helpers/tripVisuals";
import { PrimaryButton } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { fontStyles } from "@/shared/theme/typography";

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  upcoming: 1,
  past: 2,
};

export default function TripsPage() {
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();
  const createTripMutation = useCreateTripMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const summaryByTripId = useMemo(() => {
    const map = new Map<number, TripSummary>();
    for (const summary of summariesQuery.data ?? []) {
      map.set(summary.trip_id, summary);
    }
    return map;
  }, [summariesQuery.data]);

  const { tripItems, activeTrip } = useMemo(() => {
    const items = (tripsQuery.data ?? [])
      .map((trip) => toTripListItem(trip, summaryByTripId.get(trip.id)))
      .sort((a, b) => {
        const orderDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (orderDiff !== 0) return orderDiff;
        return a.dateRange.localeCompare(b.dateRange);
      });
    return {
      tripItems: items,
      activeTrip: items.find((t) => t.status === "active") ?? null,
    };
  }, [tripsQuery.data, summaryByTripId]);

  // The "featured" trip shown in the picker row — prefer the active trip, then the first in list.
  const featuredTrip = activeTrip ?? tripItems[0] ?? null;
  const activeTripIds = useMemo(
    () => tripItems.filter((trip) => trip.status === "active").map((trip) => trip.id),
    [tripItems],
  );
  const onTripSnapshotQueries = useQueries({
    queries: activeTripIds.map((tripId) => ({
      queryKey: tripKeys.onTripSnapshot(tripId),
      queryFn: () => getTripOnTripSnapshot(tripId),
      staleTime: 30_000,
      refetchInterval: false,
      retry: false,
    })),
  });
  const onTripSnapshotByTripId = useMemo(() => {
    const map = new Map<number, TripOnTripSnapshot>();
    activeTripIds.forEach((tripId, index) => {
      const snapshot = onTripSnapshotQueries[index]?.data;
      if (snapshot) map.set(tripId, snapshot);
    });
    return map;
  }, [activeTripIds, onTripSnapshotQueries]);
  const liveTripIds = useMemo(() => {
    const ids = new Set<number>();
    for (const trip of tripItems) {
      if (canOpenOnTrip(trip.status, onTripSnapshotByTripId.get(trip.id) ?? null)) {
        ids.add(trip.id);
      }
    }
    return ids;
  }, [onTripSnapshotByTripId, tripItems]);
  const featuredLiveTrip =
    featuredTrip && liveTripIds.has(featuredTrip.id) ? featuredTrip : null;

  if (tripsQuery.isLoading) {
    return <ScreenLoading label="Loading your trips…" />;
  }

  const createSheet = (
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
          const created = await createTripMutation.mutateAsync(
            buildCreateTripPayload(value),
          );
          setCreateOpen(false);
          router.push(`/(tabs)/trips/${created.id}?from=create` as Href);
        } catch {
          setCreateError("We couldn't create that trip. Try again.");
        }
      }}
    />
  );

  if (tripsQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 gap-6 px-4 py-3">
          <ScreenHeader
            title="Trips"
            rightAction={
              <PrimaryButton label="New Trip" onPress={() => setCreateOpen(true)} />
            }
          />
          <EmptyState
            title="We're still syncing your trips"
            message="We'll have them back in a moment. You can start a new one in the meantime."
            action={
              <PrimaryButton
                label="Try again"
                onPress={() => void tripsQuery.refetch()}
              />
            }
          />
        </View>
        {createSheet}
      </SafeAreaView>
    );
  }

  if (tripItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 gap-6 px-4 py-3">
          <ScreenHeader
            title="Trips"
            subtitle="Start with destination and dates — your workspace, itinerary, and logistics all grow from the same trip."
          />
          <EmptyState
            title="Open your first shared trip workspace."
            message="Shape the plan manually first, add AI assist when you want it, and keep one place your group can actually use together."
            action={
              <PrimaryButton
                label="Create your first trip"
                onPress={() => setCreateOpen(true)}
              />
            }
          />
        </View>
        {createSheet}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* TripPickerBar row */}
      <View className="flex-row items-center justify-between gap-3 px-4 py-3">
        {/* Left: trip thumbnail + title + chevron */}
        <Pressable
          onPress={() => setSwitcherOpen(true)}
          className="flex-row items-center gap-2 rounded-xl border border-smoke bg-ivory px-3 py-2 active:opacity-80"
        >
          {featuredTrip ? (
            <Image
              source={{ uri: getTripImageUrl({ id: featuredTrip.id, destination: featuredTrip.destination }) }}
              style={{ width: 24, height: 24, borderRadius: 6 }}
              contentFit="cover"
            />
          ) : null}
          <Text
            className="max-w-[180px] text-[14px] text-espresso"
            style={fontStyles.displaySemibold}
            numberOfLines={1}
          >
            {featuredTrip?.title ?? "Your trips"}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#B0A498" />
        </Pressable>

        {/* Right: optional On-Trip chip + New Trip */}
        <View className="flex-row items-center gap-2">
          {featuredLiveTrip ? (
            <Pressable
              onPress={() => router.push(`/(tabs)/trips/${featuredLiveTrip.id}/live` as Href)}
              className="flex-row items-center gap-1.5 rounded-xl border border-espresso bg-espresso px-3 py-2 active:opacity-80"
            >
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#F5C14D" }} />
              <Text className="text-[12px] font-semibold text-ivory">On-Trip</Text>
            </Pressable>
          ) : null}
          <PrimaryButton label="New Trip" onPress={() => setCreateOpen(true)} />
        </View>
      </View>

      <FlatList
        contentContainerClassName="gap-3 px-4 pb-8"
        data={tripItems}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={tripsQuery.isRefetching || summariesQuery.isRefetching}
            onRefresh={() => {
              void tripsQuery.refetch();
              void summariesQuery.refetch();
            }}
          />
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => router.push(`/(tabs)/trips/${item.id}` as Href)}
            onOpenLiveView={
              liveTripIds.has(item.id)
                ? () => router.push(`/(tabs)/trips/${item.id}/live` as Href)
                : undefined
            }
          />
        )}
      />

      <TripSwitcherSheet
        visible={switcherOpen}
        trips={tripItems}
        activeTripId={featuredTrip?.id ?? -1}
        onClose={() => setSwitcherOpen(false)}
        onSelect={(tripId) => {
          setSwitcherOpen(false);
          router.push(`/(tabs)/trips/${tripId}` as Href);
        }}
      />

      {createSheet}
    </SafeAreaView>
  );
}

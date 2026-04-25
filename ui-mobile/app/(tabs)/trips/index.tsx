import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";

import {
  TripFormSheet,
  buildCreateTripPayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { ActiveTripHeroCard } from "@/features/trips/ActiveTripHeroCard";
import { TripsListHeader } from "@/features/trips/TripsListHeader";
import { TripsSearchBar } from "@/features/trips/TripsSearchBar";
import { TripsFilterChips } from "@/features/trips/TripsFilterChips";
import { UpcomingTripRow } from "@/features/trips/UpcomingTripRow";
import { useTripsListModel } from "@/features/trips/useTripsListModel";
import { useCreateTripMutation } from "@/features/trips/hooks";
import { fontStyles } from "@/shared/theme/typography";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

export default function TripsPage() {
  const model = useTripsListModel();
  const createMutation = useCreateTripMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const openCreate = () => {
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleSubmitCreate = async (value: TripFormValue) => {
    try {
      setCreateError(null);
      const created = await createMutation.mutateAsync(buildCreateTripPayload(value));
      setCreateOpen(false);
      router.push(`/(tabs)/trips/${created.id}?from=create` as Href);
    } catch {
      setCreateError("We couldn't create that trip. Try again.");
    }
  };

  const createSheet = (
    <TripFormSheet
      visible={createOpen}
      mode="create"
      submitting={createMutation.isPending}
      error={createError}
      onClose={() => {
        setCreateOpen(false);
        setCreateError(null);
      }}
      onSubmit={handleSubmitCreate}
    />
  );

  if (model.isLoading) {
    return <ScreenLoading label="Loading your trips…" />;
  }

  if (model.isError) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <TripsListHeader subtitle="Something went wrong." onNewTrip={openCreate} />
        <View className="flex-1 px-4 pt-6">
          <EmptyState
            title="We're still syncing your trips"
            message="We'll have them back in a moment. You can start a new one in the meantime."
          />
        </View>
        {createSheet}
      </SafeAreaView>
    );
  }

  if (model.allTripsEmpty) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <TripsListHeader subtitle="No journeys ahead." onNewTrip={openCreate} />
        <View className="flex-1 items-center justify-center px-6 gap-5">
          <Text
            className="text-center text-[26px] leading-[32px] text-text"
            style={fontStyles.displaySemibold}
          >
            Where to next?
          </Text>
          <Text className="text-center text-[14px] leading-[22px] text-text-muted">
            Start a trip from a destination, dates, or a saved idea.
          </Text>
          <Pressable
            onPress={openCreate}
            className="flex-row items-center gap-2 rounded-full bg-amber px-5 py-3 active:opacity-80"
          >
            <Text className="text-[13px] font-semibold text-white">+ New trip</Text>
          </Pressable>
        </View>
        {createSheet}
      </SafeAreaView>
    );
  }

  const showActiveSection =
    (model.filter === "all" || model.filter === "active") && model.activeTrips.length > 0;
  const showUpcomingSection =
    (model.filter === "all" || model.filter === "upcoming") && model.upcomingTrips.length > 0;
  const showDraftsSection = model.filter === "all" || model.filter === "drafts";

  const noResultsForFilter =
    model.filter !== "all" &&
    model.filter !== "drafts" &&
    model.activeTrips.length === 0 &&
    model.upcomingTrips.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={model.isRefreshing}
            onRefresh={model.onRefresh}
            tintColor="#B86845"
          />
        }
      >
        <TripsListHeader subtitle={model.journeySubtitle} onNewTrip={openCreate} />

        <View className="mt-4">
          <TripsSearchBar value={model.query} onChangeText={model.setQuery} />
        </View>

        <View className="mt-3">
          <TripsFilterChips active={model.filter} onChange={model.setFilter} />
        </View>

        {/* No results for active filter */}
        {noResultsForFilter && (
          <View className="mt-8 px-4">
            <EmptyState
              title="No trips here"
              message="Try a different filter or search term."
            />
          </View>
        )}

        {/* Active section */}
        {showActiveSection && (
          <View className="mt-6 gap-3">
            <Text className="px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-soft">
              Active
            </Text>
            {model.activeTrips.map((trip) => (
              <ActiveTripHeroCard
                key={trip.id}
                trip={trip}
                onOpenWorkspace={() => router.push(`/(tabs)/trips/${trip.id}` as Href)}
                onOpenOnTrip={() => router.push(`/(tabs)/trips/${trip.id}/live` as Href)}
              />
            ))}
          </View>
        )}

        {/* Upcoming section */}
        {showUpcomingSection && (
          <View className="mt-6 gap-1">
            <View className="flex-row items-center justify-between px-4 mb-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-soft">
                Upcoming
              </Text>
              <Text className="text-[12px] font-semibold text-amber">See all</Text>
            </View>
            <View className="gap-4 px-4">
              {model.upcomingTrips.map((trip) => (
                <UpcomingTripRow
                  key={trip.id}
                  trip={trip}
                  onPress={() => router.push(`/(tabs)/trips/${trip.id}` as Href)}
                  onOpenWorkspace={() => router.push(`/(tabs)/trips/${trip.id}` as Href)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Drafts section */}
        {showDraftsSection && (
          <View className="mt-6 gap-3 px-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-soft">
              Drafts
            </Text>
            <View className="items-center gap-4 rounded-[20px] border border-dashed border-border bg-surface px-6 py-8">
              <Text
                className="text-center text-[22px] leading-[28px] text-text"
                style={fontStyles.displaySemibold}
              >
                Where to next?
              </Text>
              <Text className="text-center text-[13px] leading-[20px] text-text-muted">
                Start a trip from a destination, dates, or a saved idea.
              </Text>
              <Pressable
                onPress={openCreate}
                className="flex-row items-center gap-1.5 rounded-full bg-amber px-5 py-2.5 active:opacity-80"
              >
                <Text className="text-[13px] font-semibold text-white">+ New trip</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {createSheet}
    </SafeAreaView>
  );
}

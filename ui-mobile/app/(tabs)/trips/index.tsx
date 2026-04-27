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
import { TripsFilterChips } from "@/features/trips/TripsFilterChips";
import { UpcomingTripRow } from "@/features/trips/UpcomingTripRow";
import { useTripsListModel } from "@/features/trips/useTripsListModel";
import { useCreateTripMutation } from "@/features/trips/hooks";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

// DE.ivory = #F2EBDD
const BG = "#F2EBDD";

function SectionKicker({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-baseline justify-between px-6">
      <Text style={[textScaleStyles.caption, { color: "#8A7B6A", letterSpacing: 2.2, fontSize: 10 }]}>
        {label.toUpperCase()}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[fontStyles.uiMedium, { fontSize: 12, color: "#B85A38" }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

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
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
        <TripsListHeader subtitle="Something went wrong." onNewTrip={openCreate} />
        <View className="flex-1 px-6 pt-6">
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
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
        <TripsListHeader subtitle="No journeys ahead." onNewTrip={openCreate} />
        <View className="flex-1 items-center justify-center px-6" style={{ gap: 16 }}>
          <Text
            className="text-center"
            style={[fontStyles.headMediumItalic, { fontSize: 28, lineHeight: 33, letterSpacing: -0.3, color: "#231910" }]}
          >
            Where to next?
          </Text>
          <Text
            className="text-center"
            style={[fontStyles.uiRegular, { fontSize: 14, lineHeight: 21, maxWidth: 260, color: "#8A7B6A" }]}
          >
            Start a trip from a destination, dates, or a saved idea.
          </Text>
          <Pressable
            onPress={openCreate}
            className="flex-row items-center rounded-full active:opacity-80"
            style={{ backgroundColor: "#B85A38", paddingHorizontal: 20, paddingVertical: 10, gap: 6 }}
          >
            <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: "#FAF5EA" }]}>+ New trip</Text>
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

  // "ON TRIP · DAY 3 OF 9" — pulled from first active trip
  const firstActive = model.activeTrips[0];
  const activeTripKicker = firstActive
    ? `On trip · Day ${firstActive.dayNumber} of ${firstActive.totalDays}`
    : "On trip";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={model.isRefreshing}
            onRefresh={model.onRefresh}
            tintColor="#B85A38"
          />
        }
      >
        <TripsListHeader subtitle={model.journeySubtitle} onNewTrip={openCreate} />

        {/* Filter chips — no search bar per reference design */}
        <View style={{ marginTop: 2, marginBottom: 22 }}>
          <TripsFilterChips active={model.filter} onChange={model.setFilter} />
        </View>

        {noResultsForFilter && (
          <View className="mt-8 px-6">
            <EmptyState title="No trips here" message="Try a different filter." />
          </View>
        )}

        {/* Active / On-trip section */}
        {showActiveSection && (
          <View style={{ gap: 10 }}>
            <SectionKicker label={activeTripKicker} />
            <View style={{ gap: 12 }}>
              {model.activeTrips.map((trip) => (
                <ActiveTripHeroCard
                  key={trip.id}
                  trip={trip}
                  onOpenWorkspace={() => router.push(`/(tabs)/trips/${trip.id}` as Href)}
                  onOpenOnTrip={() => router.push(`/(tabs)/trips/${trip.id}/live` as Href)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Upcoming section */}
        {showUpcomingSection && (
          <View style={{ marginTop: showActiveSection ? 32 : 0, gap: 14 }}>
            <SectionKicker label="Upcoming" action="See all ›" onAction={() => {}} />
            <View className="px-6" style={{ gap: 12 }}>
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
          <View style={{ marginTop: 32, gap: 14 }}>
            <SectionKicker label="Drafts" />
            <View className="px-6">
              <View
                className="items-center"
                style={{
                  paddingHorizontal: 22,
                  paddingVertical: 24,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "rgba(35,25,16,0.18)",
                  gap: 10,
                  backgroundColor: "transparent",
                }}
              >
                <Text
                  style={[fontStyles.headMediumItalic, { fontSize: 22, letterSpacing: -0.3, lineHeight: 26, color: "#231910" }]}
                >
                  Where to next?
                </Text>
                <Text
                  className="text-center"
                  style={[fontStyles.uiRegular, { fontSize: 13, lineHeight: 20, maxWidth: 260, color: "#8A7B6A" }]}
                >
                  Start a trip from a destination, dates, or a saved idea.
                </Text>
                <Pressable
                  onPress={openCreate}
                  className="flex-row items-center rounded-full active:opacity-80"
                  style={{ backgroundColor: "#B85A38", paddingHorizontal: 20, paddingVertical: 10, gap: 6, marginTop: 4 }}
                >
                  <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: "#FAF5EA" }]}>+ New trip</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {createSheet}
    </SafeAreaView>
  );
}

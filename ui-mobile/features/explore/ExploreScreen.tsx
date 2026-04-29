// Path: ui-mobile/features/explore/ExploreScreen.tsx
// Summary: Implements ExploreScreen module logic.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";

import { EmptyState } from "@/shared/ui/EmptyState";
import { fontStyles } from "@/shared/theme/typography";
import {
  TripFormSheet,
  buildCreateTripPayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { useCreateTripMutation } from "@/features/trips/hooks";

import { CategoryChips } from "./CategoryChips";
import { ExploreHeader } from "./ExploreHeader";
import { ExploreSearchBar } from "./ExploreSearchBar";
import { FeaturedDestinationCard } from "./FeaturedDestinationCard";
import { GridDestinationCard } from "./GridDestinationCard";
import type { GridCardViewModel } from "./types";
import { useExploreScreen } from "./useExploreScreen";

export function ExploreScreen() {
  const model = useExploreScreen();
  const createMutation = useCreateTripMutation();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmitCreate = async (value: TripFormValue) => {
    try {
      setCreateError(null);
      const created = await createMutation.mutateAsync(buildCreateTripPayload(value));
      model.closePlanTrip();
      router.push(`/(tabs)/trips/${created.id}?from=create` as Href);
    } catch {
      setCreateError("We couldn't create that trip. Try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <ExploreHeader />

        <View className="mt-4">
          <ExploreSearchBar value={model.query} onChangeText={model.setQuery} />
        </View>

        <View className="mt-3">
          <CategoryChips
            themes={model.themes}
            activeTheme={model.activeTheme}
            onSelectTheme={model.setActiveTheme}
          />
        </View>

        {/* Featured — always visible when not filtering */}
        {model.showFeatured && (
          <View className="mt-6 gap-3">
            <Text
              className="px-4 text-[11px] uppercase tracking-[0.12em] text-text-soft"
              style={fontStyles.uiSemibold}
            >
              Featured
            </Text>
            {model.featuredCards.map((item) => (
              <FeaturedDestinationCard
                key={item.id}
                item={item}
                onPlanTrip={model.openPlanTrip}
              />
            ))}
          </View>
        )}

        {/* Grid section — title changes based on filter state */}
        <View className="mt-6 px-4 gap-3">
          {model.isFiltering ? (
            <Text
              className="text-[11px] uppercase tracking-[0.12em] text-text-soft"
              style={fontStyles.uiSemibold}
            >
              Results
            </Text>
          ) : (
            <Text
              className="text-[11px] uppercase tracking-[0.12em] text-text-soft"
              style={fontStyles.uiSemibold}
            >
              More to Consider
            </Text>
          )}

          {model.hasResults ? (
            <DestinationGrid items={model.moreToConsiderCards} onPlanTrip={model.openPlanTrip} />
          ) : (
            <EmptyState
              title="No destinations found"
              message="Try a different search or clear the filter to browse all destinations."
            />
          )}
        </View>
      </ScrollView>

      <TripFormSheet
        visible={model.planTripDestination !== null}
        mode="create"
        initialDestination={model.planTripDestination ?? undefined}
        submitting={createMutation.isPending}
        error={createError}
        onClose={() => {
          model.closePlanTrip();
          setCreateError(null);
        }}
        onSubmit={handleSubmitCreate}
      />
    </SafeAreaView>
  );
}

function DestinationGrid({
  items,
  onPlanTrip,
}: {
  items: GridCardViewModel[];
  onPlanTrip: (destination: string) => void;
}) {
  const rows: GridCardViewModel[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View className="gap-3">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-3">
          {row.map((item) => (
            <GridDestinationCard key={item.id} item={item} onPlanTrip={onPlanTrip} />
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

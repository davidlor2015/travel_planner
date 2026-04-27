import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/shared/ui/EmptyState";
import { fontStyles } from "@/shared/theme/typography";

import { CategoryChips } from "./CategoryChips";
import { ExploreHeader } from "./ExploreHeader";
import { ExploreSearchBar } from "./ExploreSearchBar";
import { FeaturedDestinationCard } from "./FeaturedDestinationCard";
import { GridDestinationCard } from "./GridDestinationCard";
import type { GridCardViewModel } from "./types";
import { useExploreScreen } from "./useExploreScreen";

export function ExploreScreen() {
  const model = useExploreScreen();

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
            moods={model.moods}
            activeMood={model.activeMood}
            onSelectMood={model.setActiveMood}
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
              <FeaturedDestinationCard key={item.id} item={item} />
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
            <DestinationGrid items={model.moreToConsiderCards} />
          ) : (
            <EmptyState
              title="No destinations found"
              message="Try a different search or clear the filter to browse all destinations."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DestinationGrid({ items }: { items: GridCardViewModel[] }) {
  const rows: GridCardViewModel[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View className="gap-3">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-3">
          {row.map((item) => (
            <GridDestinationCard key={item.id} item={item} />
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

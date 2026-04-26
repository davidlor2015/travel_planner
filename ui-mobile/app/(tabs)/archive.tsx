import { useCallback, useRef } from "react";
import {
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
  type SectionListRenderItemInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router } from "expo-router";

import {
  useArchiveScreen,
} from "@/features/trips/archive/useArchiveScreen";
import type { ArchiveTripViewModel, ArchiveYearGroup } from "@/features/trips/archive/archiveUtils";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

// ─── Memory stats helpers ─────────────────────────────────────────────────────

function formatSpent(amount: number): string {
  if (amount >= 10000) return `$${Math.round(amount / 1000)}k spent`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k spent`;
  return `$${Math.round(amount)} spent`;
}

function MemoryStats({ trip }: { trip: ArchiveTripViewModel }) {
  const stats: string[] = [];
  if (trip.hasSavedItinerary) stats.push("Itinerary");
  if (trip.reservationCount > 0)
    stats.push(`${trip.reservationCount} booking${trip.reservationCount === 1 ? "" : "s"}`);
  if (trip.totalSpent != null && trip.totalSpent > 0)
    stats.push(formatSpent(trip.totalSpent));
  if (trip.memberCount > 1)
    stats.push(`${trip.memberCount} travelers`);

  if (stats.length === 0) return null;

  return (
    <View className="mt-1.5 flex-row flex-wrap gap-1">
      {stats.map((stat) => (
        <View key={stat} className="rounded-full bg-parchment px-2 py-0.5">
          <Text style={fontStyles.uiMedium} className="text-[10px] text-flint">
            {stat}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Archive trip card ───────────────────────────────────────────────────────

function ArchiveTripCard({
  trip,
  onPress,
}: {
  trip: ArchiveTripViewModel;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trip.title}, ${trip.destination}`}
      className="active:opacity-70"
    >
      <View className="flex-row items-center gap-3 rounded-[18px] border border-smoke bg-white px-4 py-4">
        {/* Accent dot */}
        <View className="h-2 w-2 flex-shrink-0 rounded-full bg-amber opacity-60 mt-[2px]" />

        <View className="flex-1 gap-0.5">
          <Text
            style={textScaleStyles.titleM}
            className="text-espresso"
            numberOfLines={1}
          >
            {trip.title}
          </Text>
          <Text
            style={fontStyles.uiRegular}
            className="text-[13px] text-muted"
            numberOfLines={1}
          >
            {trip.destination}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text style={fontStyles.uiMedium} className="text-[11px] text-flint">
              {trip.dateRange}
            </Text>
            <Text className="text-[11px] text-flint opacity-40">·</Text>
            <Text style={fontStyles.uiMedium} className="text-[11px] text-flint">
              {trip.duration}
            </Text>
          </View>
          <MemoryStats trip={trip} />
        </View>

        <Ionicons name="chevron-forward" size={14} color="#8A7E74" />
      </View>
    </Pressable>
  );
}

// ─── Year section header ─────────────────────────────────────────────────────

function YearHeader({ year, count }: { year: number; count: number }) {
  return (
    <View className="flex-row items-baseline gap-2 pb-2 pt-5">
      <Text style={textScaleStyles.displayL} className="text-espresso">
        {year}
      </Text>
      <Text style={fontStyles.uiMedium} className="text-[12px] text-muted">
        {count} trip{count === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

// ─── Search bar ──────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (q: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-[14px] border border-smoke bg-white px-3.5 py-2.5">
      <Ionicons name="search-outline" size={16} color="#8A7E74" />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search destinations or trips…"
        placeholderTextColor="#C9BCA8"
        returnKeyType="search"
        clearButtonMode="never"
        style={[fontStyles.uiRegular, { flex: 1, fontSize: 14, color: "#1C1108" }]}
        accessibilityLabel="Search past trips"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={16} color="#8A7E74" />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function NoArchiveState() {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <View className="h-14 w-14 items-center justify-center rounded-full border border-smoke bg-parchment">
        <Ionicons name="map-outline" size={26} color="#B86845" />
      </View>
      <Text style={textScaleStyles.displayL} className="text-espresso text-center">
        No memories yet.
      </Text>
      <Text style={fontStyles.uiRegular} className="text-[14px] text-muted text-center leading-5">
        Completed trips will appear here after their end date. Waypoint will keep track of what you planned, what you visited, and what changed along the way.
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/trips" as Href)}
        accessibilityRole="button"
        className="mt-1 rounded-full border border-smoke bg-white px-5 py-2.5"
      >
        <Text style={fontStyles.uiMedium} className="text-[13px] text-espresso">
          View Trips
        </Text>
      </Pressable>
    </View>
  );
}

function NoResultsState({ query }: { query: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3 pt-16">
      <Ionicons name="search-outline" size={28} color="#C9BCA8" />
      <Text style={fontStyles.uiSemibold} className="text-[16px] text-espresso text-center">
        No matches for {`"${query}"`}
      </Text>
      <Text style={fontStyles.uiRegular} className="text-[13px] text-muted text-center">
        Try searching by destination or trip name.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    yearGroups,
    hasNoArchive,
    hasNoResults,
  } = useArchiveScreen();

  const handleClear = useCallback(() => setSearchQuery(""), [setSearchQuery]);

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<ArchiveTripViewModel, ArchiveYearGroup>) => (
      <ArchiveTripCard
        trip={item}
        onPress={() => router.push(`/(tabs)/trips/${item.id}` as Href)}
      />
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ArchiveYearGroup }) => (
      <YearHeader year={section.year} count={section.data.length} />
    ),
    [],
  );

  if (isLoading) {
    return <ScreenLoading label="Loading memories…" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pb-1 pt-4">
        <Text style={textScaleStyles.displayL} className="text-espresso">
          Memories
        </Text>
        <Text style={fontStyles.uiRegular} className="mt-0.5 text-[13px] text-muted">
          Your travels, remembered.
        </Text>
      </View>

      {/* Search bar — always shown once loading is done */}
      {!hasNoArchive ? (
        <View className="pt-3">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={handleClear}
          />
        </View>
      ) : null}

      {/* Content */}
      {hasNoArchive ? (
        <NoArchiveState />
      ) : hasNoResults ? (
        <NoResultsState query={searchQuery} />
      ) : (
        <SectionList<ArchiveTripViewModel, ArchiveYearGroup>
          sections={yearGroups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// Path: ui-mobile/app/(tabs)/archive.tsx
// Summary: Implements archive module logic.

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
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";

import {
  useArchiveScreen,
} from "@/features/trips/archive/useArchiveScreen";
import type { ArchiveTripViewModel, ArchiveYearGroup } from "@/features/trips/archive/archiveUtils";
import { DE } from "@/shared/theme/desertEditorial";
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

function MemoryExecutionSummary({ trip }: { trip: ArchiveTripViewModel }) {
  const executionSummary = trip.executionSummary;
  if (!executionSummary) return null;

  const hasExecutionHistory =
    executionSummary.confirmedStopsCount > 0 ||
    executionSummary.skippedStopsCount > 0 ||
    executionSummary.unplannedStopsCount > 0;

  return (
    <Text style={fontStyles.uiRegular} className="mt-1 text-[11px] text-muted">
      {hasExecutionHistory
        ? `Visited ${executionSummary.confirmedStopsCount} · Skipped ${executionSummary.skippedStopsCount} · Added ${executionSummary.unplannedStopsCount}`
        : "No execution history yet"}
    </Text>
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
            <Text style={fontStyles.uiMedium} className="text-[11px] text-flint opacity-40">
              ·
            </Text>
            <Text style={fontStyles.uiMedium} className="text-[11px] text-flint">
              {trip.duration}
            </Text>
          </View>
          <MemoryStats trip={trip} />
          <MemoryExecutionSummary trip={trip} />
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

function MemoriesEmptyIllustration() {
  return (
    <View
      className="mb-2 w-full max-w-[320px] overflow-hidden rounded-[24px] border"
      style={{ borderColor: DE.ruleStrong, backgroundColor: DE.paper }}
    >
      <LinearGradient
        colors={["rgba(250,245,234,0.92)", "rgba(239,216,201,0.40)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="px-5 pb-5 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <View
            className="rounded-full border px-3 py-1"
            style={{ borderColor: DE.ruleStrong, backgroundColor: "rgba(248,241,226,0.82)" }}
          >
            <Text
              style={[fontStyles.monoRegular, { fontSize: 9, letterSpacing: 1.6, color: DE.muted }]}
            >
              MEMORY STAMPS
            </Text>
          </View>
          <Ionicons name="sparkles-outline" size={13} color={DE.mutedLight} />
        </View>

        <View className="flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl border"
            style={{ borderColor: DE.ruleStrong, backgroundColor: "rgba(250,245,234,0.88)" }}
          >
            <Ionicons name="bookmark-outline" size={22} color={DE.clay} />
          </View>
          <View className="flex-1">
            <View className="mb-2 h-px" style={{ backgroundColor: DE.rule }} />
            <View className="h-px" style={{ backgroundColor: DE.rule }} />
          </View>
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(148,164,135,0.18)" }}
          >
            <Ionicons name="ellipse-outline" size={12} color={DE.sageDeep} />
          </View>
        </View>
      </View>
    </View>
  );
}

function NoArchiveState() {
  return (
    <View className="flex-1 px-6 pb-8 pt-5">
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
        <LinearGradient
          colors={["rgba(250,245,234,0.82)", "rgba(250,245,234,0.96)"]}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          className="absolute -right-12 top-16 h-40 w-40 rounded-full"
          style={{ backgroundColor: "rgba(239,216,201,0.22)" }}
        />
        <View
          className="absolute -left-16 bottom-14 h-52 w-52 rounded-full"
          style={{ backgroundColor: "rgba(148,164,135,0.10)" }}
        />
      </View>

      <View className="flex-1 items-center justify-center gap-4">
        <MemoriesEmptyIllustration />
        <Text style={textScaleStyles.displayL} className="text-center text-espresso">
          No memories yet.
        </Text>
        <Text style={fontStyles.uiRegular} className="text-center text-[14px] leading-5 text-muted">
          When a trip wraps, it settles here with the plan, the places you made it to, and the detours that made it yours.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/trips" as Href)}
          accessibilityRole="button"
          className="mt-1 rounded-full border border-smoke bg-white px-5 py-2.5"
        >
          <Text style={fontStyles.uiMedium} className="text-[13px] text-espresso">
            Browse Trips
          </Text>
        </Pressable>
      </View>
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

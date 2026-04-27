import { useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/shared/ui/Button";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

import { ItineraryTimelineDay } from "./ItineraryTimelineDay";
import {
  ITINERARY_FILTERS,
  type ItineraryFilterKey,
  type ItineraryTabDay,
} from "./itineraryPresentation";

type Props = {
  days: ItineraryTabDay[];
  allDayCount: number;
  filter: ItineraryFilterKey;
  onFilterChange: (filter: ItineraryFilterKey) => void;
  isLoading: boolean;
  isMissing: boolean;
  isStreaming: boolean;
  isDirty: boolean;
  isSaving: boolean;
  streamText: string | null;
  error: string | null;
  onAddStop: (dayIndex: number) => void;
  onEditStop: (dayIndex: number, stopIndex: number) => void;
  onAddDay: () => void;
  onPublish: () => void;
  onRegenerateAll: () => void;
  onCancelStream: () => void;
};

export function ItineraryTabView({
  days,
  allDayCount,
  filter,
  onFilterChange,
  isLoading,
  isMissing,
  isStreaming,
  isDirty,
  isSaving,
  streamText,
  error,
  onAddStop,
  onEditStop,
  onAddDay,
  onPublish,
  onRegenerateAll,
  onCancelStream,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const firstVisibleDayIndex = days[0]?.dayIndex ?? null;
  const canEditItinerary = !isLoading && !isMissing && !isStreaming;
  const canAddStop = canEditItinerary && firstVisibleDayIndex !== null;

  function handleAddDayPress() {
    if (!canEditItinerary) return;
    if (filter !== "all") {
      onFilterChange("all");
    }
    onAddDay();
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 0);
  }

  function handleAddPress() {
    if (canAddStop) {
      onAddStop(firstVisibleDayIndex);
      return;
    }
    handleAddDayPress();
  }

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="flex-row items-center justify-between px-[22px] py-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          className="min-w-0 flex-1"
        >
          {ITINERARY_FILTERS.map((item) => {
            const isActive = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => onFilterChange(item.key)}
                className="h-[30px] justify-center rounded-full border px-3.5 active:opacity-70"
                style={{
                  backgroundColor: isActive ? DE.ink : "transparent",
                  borderColor: isActive ? DE.ink : DE.ruleStrong,
                }}
              >
                <Text
                  className="text-[12px] leading-[16px]"
                  style={[
                    isActive ? fontStyles.uiSemibold : fontStyles.uiMedium,
                    { color: isActive ? DE.ivory : DE.inkSoft },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="shrink-0 flex-row gap-2">
          <Pressable
            onPress={handleAddPress}
            disabled={!canEditItinerary}
            className={[
              "h-[30px] flex-row items-center justify-center rounded-full border border-dashed bg-transparent px-3.5 active:opacity-70",
              canEditItinerary ? "" : "opacity-40",
            ].join(" ")}
            style={{ borderColor: "rgba(184, 90, 56, 0.40)" }}
            accessibilityRole="button"
            accessibilityLabel={canAddStop ? "Add itinerary stop" : "Add itinerary day"}
          >
            <Text
              className="text-[12px]"
              style={[fontStyles.uiSemibold, { color: DE.clay }]}
            >
              + Add
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text className="mx-5 mt-3 rounded-[14px] border border-danger/20 bg-danger/5 px-3 py-3 text-[13px] leading-5 text-danger">
          {error}
        </Text>
      ) : null}

      {isLoading && !isStreaming ? (
        <ActivityIndicator className="py-8" color={DE.clay} />
      ) : isStreaming ? (
        <View
          className="mx-[22px] mt-2 gap-2 rounded-[16px] border px-4 py-4"
          style={{
            backgroundColor: "rgba(184, 90, 56, 0.05)",
            borderColor: "rgba(184, 90, 56, 0.25)",
          }}
        >
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={DE.clay} />
            <Text className="text-[13px]" style={[fontStyles.uiSemibold, { color: DE.clay }]}>
              Generating itinerary...
            </Text>
          </View>
          <Text className="text-[11px] leading-[16px]" style={{ color: DE.muted }} numberOfLines={4}>
            {streamText ? streamText.slice(-280) : "Connecting to AI..."}
          </Text>
          <Pressable
            onPress={onCancelStream}
            className="self-start rounded-full border px-4 py-2 active:opacity-70"
            style={{ borderColor: DE.rule }}
          >
            <Text className="text-[12px]" style={[fontStyles.uiSemibold, { color: DE.inkSoft }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : isMissing ? (
        <View
          className="mx-[22px] mt-2 gap-3 rounded-[16px] border px-4 py-5"
          style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
        >
          <Text className="text-[13px] leading-5" style={{ color: DE.muted }}>
            No itinerary saved yet. Generate one to start planning day-by-day.
          </Text>
          <Pressable
            onPress={onRegenerateAll}
            className="self-start rounded-[12px] px-4 py-2 active:opacity-75"
            style={{ backgroundColor: DE.clay }}
          >
            <Text className="text-[13px]" style={[fontStyles.uiSemibold, { color: DE.ivory }]}>
              Generate with AI
            </Text>
          </Pressable>
        </View>
      ) : days.length > 0 ? (
        <View className="gap-7">
          {days.map((day) => (
            <ItineraryTimelineDay
              key={day.day.day_number}
              day={day}
              onEditStop={(stopIndex) => onEditStop(day.dayIndex, stopIndex)}
            />
          ))}

          {isDirty ? (
            <View className="mx-[22px]">
              <PrimaryButton
                label={isSaving ? "Publishing..." : "Publish changes"}
                onPress={onPublish}
                disabled={isSaving}
                fullWidth
              />
            </View>
          ) : null}

          <Pressable
            onPress={onRegenerateAll}
            disabled={isDirty}
            className={[
              "mx-[22px] items-center justify-center rounded-[12px] border py-2.5 active:opacity-70",
              isDirty ? "opacity-50" : "",
            ].join(" ")}
            style={{ borderColor: DE.ruleStrong }}
          >
            <Text className="text-[12px]" style={[fontStyles.uiSemibold, { color: DE.muted }]}>
              {isDirty ? "Publish changes before regenerating" : "Regenerate with AI"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          className="mx-[22px] mt-2 gap-3 rounded-[16px] border px-4 py-5"
          style={{ backgroundColor: DE.paper, borderColor: DE.rule }}
        >
          <Text className="text-[13px] leading-5" style={{ color: DE.muted }}>
            {allDayCount === 0
              ? "No itinerary days yet. Add a day to start building the trip."
              : "No stops match this filter."}
          </Text>
          {allDayCount === 0 && canEditItinerary ? (
            <Pressable
              onPress={handleAddDayPress}
              className="self-start rounded-[12px] px-4 py-2 active:opacity-75"
              style={{ backgroundColor: DE.clay }}
              accessibilityRole="button"
              accessibilityLabel="Add first itinerary day"
            >
              <Text className="text-[13px]" style={[fontStyles.uiSemibold, { color: DE.ivory }]}>
                Add day
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

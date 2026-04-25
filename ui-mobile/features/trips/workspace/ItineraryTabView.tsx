import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/shared/ui/Button";

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
  onPublish,
  onRegenerateAll,
  onCancelStream,
}: Props) {
  const firstDayIndex = days[0]?.dayIndex ?? 0;
  const canAddStop = allDayCount > 0 && !isLoading && !isMissing && !isStreaming;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="flex-row items-center justify-between px-5 pt-4">
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
                className={[
                  "h-7 justify-center rounded-full border px-3 active:opacity-70",
                  isActive
                    ? "border-espresso bg-espresso"
                    : "border-divider bg-transparent",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-[11px] leading-[16px]",
                    isActive ? "font-semibold text-ivory" : "font-medium text-flint",
                  ].join(" ")}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => onAddStop(firstDayIndex)}
          disabled={!canAddStop}
          className={[
            "h-7 shrink-0 flex-row items-center justify-center gap-1 rounded-full border border-amber/40 bg-amber/10 px-3 active:opacity-70",
            canAddStop ? "" : "opacity-40",
          ].join(" ")}
          accessibilityRole="button"
          accessibilityLabel="Add itinerary stop"
        >
          <Ionicons name="add" size={13} color="#B86845" />
          <Text className="text-[11px] font-semibold text-amber">Add</Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="mx-5 mt-3 rounded-[14px] border border-danger/20 bg-danger/5 px-3 py-3 text-[13px] leading-5 text-danger">
          {error}
        </Text>
      ) : null}

      {isLoading && !isStreaming ? (
        <ActivityIndicator className="py-8" color="#B86845" />
      ) : isStreaming ? (
        <View className="mx-5 mt-4 gap-2 rounded-[16px] border border-amber/25 bg-amber/5 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#B86845" />
            <Text className="text-[13px] font-semibold text-amber">Generating itinerary...</Text>
          </View>
          <Text className="text-[11px] leading-[16px] text-muted" numberOfLines={4}>
            {streamText ? streamText.slice(-280) : "Connecting to AI..."}
          </Text>
          <Pressable
            onPress={onCancelStream}
            className="self-start rounded-full border border-divider px-4 py-2 active:opacity-70"
          >
            <Text className="text-[12px] font-semibold text-flint">Cancel</Text>
          </Pressable>
        </View>
      ) : isMissing ? (
        <View className="mx-5 mt-5 gap-3 rounded-[16px] border border-divider bg-ivory px-4 py-5">
          <Text className="text-[13px] leading-5 text-muted">
            No itinerary saved yet. Generate one to start planning day-by-day.
          </Text>
          <Pressable
            onPress={onRegenerateAll}
            className="self-start rounded-full bg-amber px-4 py-2 active:opacity-75"
          >
            <Text className="text-[13px] font-semibold text-white">Generate with AI</Text>
          </Pressable>
        </View>
      ) : days.length > 0 ? (
        <View className="mt-5 gap-5 px-5">
          {days.map((day) => (
            <ItineraryTimelineDay
              key={day.day.day_number}
              day={day}
              onEditStop={(stopIndex) => onEditStop(day.dayIndex, stopIndex)}
            />
          ))}

          {isDirty ? (
            <PrimaryButton
              label={isSaving ? "Publishing..." : "Publish changes"}
              onPress={onPublish}
              disabled={isSaving}
              fullWidth
            />
          ) : null}

          <Pressable
            onPress={onRegenerateAll}
            disabled={isDirty}
            className={[
              "items-center justify-center rounded-full border border-border-strong py-2.5 active:opacity-70",
              isDirty ? "opacity-50" : "",
            ].join(" ")}
          >
            <Text className="text-[12px] font-semibold text-muted">
              {isDirty ? "Publish changes before regenerating" : "Regenerate with AI"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mx-5 mt-5 rounded-[16px] border border-divider bg-ivory px-4 py-5">
          <Text className="text-[13px] leading-5 text-muted">
            No stops match this filter.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

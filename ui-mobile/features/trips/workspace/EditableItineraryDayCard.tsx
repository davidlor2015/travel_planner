import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { DayPlan } from "@/features/ai/api";
import { fontStyles } from "@/shared/theme/typography";

type Props = {
  day: DayPlan;
  onAddStop: () => void;
  onEditStop: (stopIndex: number) => void;
  onRegenerate?: () => void;
};

export function EditableItineraryDayCard({
  day,
  onAddStop,
  onEditStop,
  onRegenerate,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const title = day.day_title?.trim() || `Day ${day.day_number}`;
  const stopCount = day.items.length;

  return (
    <View className="rounded-[24px] border border-border bg-surface-muted px-4 py-4">
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
        className="flex-row items-start gap-3 active:opacity-70"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-text">
          <Text className="text-xs text-ivory" style={fontStyles.uiBold}>
            {day.day_number}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base text-text" style={fontStyles.uiSemibold}>
            {title}
          </Text>
          <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
            {[day.date, `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <Text className="text-xl leading-6 text-text-muted" style={fontStyles.uiRegular}>
          {expanded ? "−" : "+"}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="mt-4 gap-2">
          {day.items.length > 0 ? (
            day.items.map((item, index) => (
              <Pressable
                key={`${day.day_number}-${index}-${item.title}`}
                onPress={() => onEditStop(index)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title || "stop"}`}
                className="flex-row gap-3 py-1 active:opacity-70"
              >
                <View className="w-16 pt-3">
                  <Text
                    className="text-xs uppercase tracking-[0.4px] text-text-soft"
                    style={fontStyles.monoRegular}
                  >
                    {item.time?.trim() || "TBD"}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl border border-border bg-white px-3 py-3">
                  <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
                    {item.title?.trim() || "Untitled stop"}
                  </Text>
                  {item.location?.trim() ? (
                    <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                      {item.location.trim()}
                    </Text>
                  ) : null}
                  {item.notes?.trim() ? (
                    <Text className="mt-1 text-xs text-text-soft" style={fontStyles.uiRegular}>
                      {item.notes.trim()}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : (
            <Text
              className="rounded-2xl border border-border bg-white px-4 py-4 text-sm text-text-muted"
              style={fontStyles.uiRegular}
            >
              Nothing scheduled for this day.
            </Text>
          )}

          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={onAddStop}
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center rounded-full border border-border-strong py-2.5 active:opacity-70"
            >
              <Text className="text-xs text-text-muted" style={fontStyles.uiSemibold}>
                Add stop
              </Text>
            </Pressable>
            {onRegenerate ? (
              <Pressable
                onPress={onRegenerate}
                accessibilityRole="button"
                accessibilityLabel={`Regenerate ${day.day_title?.trim() || `Day ${day.day_number}`}`}
                className="flex-row items-center justify-center rounded-full border border-border-strong px-4 py-2.5 active:opacity-70"
              >
                <Text className="text-xs text-text-muted" style={fontStyles.uiSemibold}>
                  Improve day
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

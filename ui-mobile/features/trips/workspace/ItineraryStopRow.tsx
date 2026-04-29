// Path: ui-mobile/features/trips/workspace/ItineraryStopRow.tsx
// Summary: Implements ItineraryStopRow module logic.

import { Text, View } from "react-native";

import { formatTripStopTime } from "@/features/trips/stopTime";
import { fontStyles } from "@/shared/theme/typography";

type Props = {
  time: string | null;
  title: string;
  location: string | null;
  notes?: string | null;
};

export function ItineraryStopRow({ time, title, location, notes }: Props) {
  return (
    <View className="flex-row gap-3 py-2">
      <View className="w-[78px] shrink-0 pr-1">
        <Text
          className="text-xs uppercase tracking-[0.4px] text-text-soft"
          style={[fontStyles.monoRegular, { fontVariant: ["tabular-nums"] }]}
        >
          {formatTripStopTime(time)}
        </Text>
      </View>
      <View className="flex-1 rounded-2xl border border-border bg-white px-3 py-3">
        <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
          {title}
        </Text>
        {location ? (
          <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
            {location}
          </Text>
        ) : null}
        {notes ? (
          <Text className="mt-1 text-xs text-text-soft" style={fontStyles.uiRegular}>
            {notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

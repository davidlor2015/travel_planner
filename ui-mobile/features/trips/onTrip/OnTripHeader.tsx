import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  title: string;
  readOnly: boolean;
  dayLabel?: string;
  progressLabel?: string;
  onBack: () => void;
};

// Compact topbar — mirrors the design's minimal status bar.
// Day/status left, progress right. No large Playfair title block.
export function OnTripHeader({
  title,
  readOnly,
  dayLabel,
  progressLabel,
  onBack,
}: Props) {
  return (
    <View className="border-b border-border-ontrip bg-surface-ontrip px-4 py-3">
      <View className="flex-row items-center gap-3">
        {/* Back */}
        <Pressable onPress={onBack} hitSlop={12} className="pr-1">
          <Ionicons name="chevron-back" size={20} color="#8A7866" />
        </Pressable>

        {/* Status + title */}
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-accent-ontrip" />
            <Text
              className="text-[10px] uppercase tracking-[2px] text-accent-ontrip"
              style={fontStyles.uiMedium}
            >
              {dayLabel ?? "On-Trip"}
            </Text>
          </View>
          <Text
            className="text-[15px] text-ontrip"
            style={fontStyles.uiSemibold}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right: read-only or progress */}
        <View className="items-end gap-0.5">
          {readOnly ? (
            <Text
              className="text-[10px] uppercase tracking-[1.5px] text-ontrip-muted"
              style={fontStyles.uiMedium}
            >
              Read-only
            </Text>
          ) : null}
          {progressLabel ? (
            <Text
              className="text-[10px] uppercase tracking-[1.5px] text-ontrip-muted"
              style={fontStyles.uiMedium}
            >
              {progressLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import type { TripOnTripBlocker } from "../types";

export function NeedsAttentionCard({ blockers }: { blockers: TripOnTripBlocker[] }) {
  if (blockers.length === 0) return null;

  return (
    <View
      className="flex-row items-start gap-3 rounded-[14px] px-3.5 py-3"
      style={{
        backgroundColor: "rgba(184, 104, 69, 0.07)",
        borderWidth: 1,
        borderColor: "rgba(184, 104, 69, 0.22)",
      }}
      accessibilityRole="alert"
      accessibilityLabel={`${blockers.length} item${blockers.length === 1 ? "" : "s"} need attention`}
    >
      {/* Amber dot indicator */}
      <View className="mt-[3px] h-2 w-2 flex-shrink-0 rounded-full bg-accent-ontrip" />

      <View className="flex-1 gap-0.5">
        <Text
          className="text-[10px] uppercase tracking-[1.5px] text-accent-ontrip"
          style={fontStyles.uiSemibold}
        >
          Needs attention
        </Text>
        {blockers.map((blocker) => (
          <Text
            key={blocker.id}
            className="text-[12px] leading-[18px] text-ontrip-muted"
            style={fontStyles.uiRegular}
          >
            {blocker.title}
          </Text>
        ))}
      </View>
    </View>
  );
}

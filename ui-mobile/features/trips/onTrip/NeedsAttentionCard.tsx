import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import type { TripOnTripBlocker } from "../types";

export function NeedsAttentionCard({ blockers }: { blockers: TripOnTripBlocker[] }) {
  if (blockers.length === 0) return null;

  return (
    <View className="rounded-[20px] border border-border-ontrip-strong bg-surface-ontrip-raised p-4">
      <Text
        className="mb-3 text-[10px] uppercase tracking-[2px] text-accent-ontrip"
        style={fontStyles.uiSemibold}
      >
        Needs attention
      </Text>
      <View className="gap-2">
        {blockers.map((blocker) => (
          <View
            key={blocker.id}
            className="rounded-[14px] border border-border-ontrip bg-surface-ontrip px-4 py-3"
          >
            <Text className="text-[14px] text-ontrip" style={fontStyles.uiSemibold}>
              {blocker.title}
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-ontrip-muted" style={fontStyles.uiRegular}>
              {blocker.detail}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

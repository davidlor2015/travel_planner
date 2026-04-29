// Path: ui-mobile/features/trips/onTrip/NeedsAttentionCard.tsx
// Summary: Implements NeedsAttentionCard module logic.

import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";
import type { TripOnTripBlocker } from "../types";
import { buildBlockerStrip } from "./presentation";

export function NeedsAttentionCard({ blockers }: { blockers: TripOnTripBlocker[] }) {
  const blocker = buildBlockerStrip(blockers);
  if (!blocker) return null;

  return (
    <View
      className="flex-row items-center gap-3 rounded-[14px] border border-divider bg-[#EAD7C9] px-4 py-3"
      accessibilityRole="alert"
      accessibilityLabel={`${blockers.length} item${blockers.length === 1 ? "" : "s"} need attention`}
    >
      <Ionicons name="alert-circle-outline" size={16} color="#B86845" />

      <View className="min-w-0 flex-1">
        <Text
          className="text-[12px] leading-[18px] text-ontrip"
          style={fontStyles.uiMedium}
          numberOfLines={1}
        >
          {blocker.title}
        </Text>
        {blocker.detail ? (
          <Text
            className="text-[11px] leading-[16px] text-clay"
            style={fontStyles.uiRegular}
            numberOfLines={1}
          >
            {blocker.detail}
          </Text>
        ) : null}
      </View>
      {blocker.actionLabel ? (
        <Text className="text-[12px] text-amber" style={fontStyles.uiSemibold}>
          {blocker.actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

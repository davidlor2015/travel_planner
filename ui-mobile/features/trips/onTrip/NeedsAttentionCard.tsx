import { Text, View } from "react-native";

import type { TripOnTripBlocker } from "../types";

export function NeedsAttentionCard({ blockers }: { blockers: TripOnTripBlocker[] }) {
  if (blockers.length === 0) return null;

  return (
    <View className="gap-2 rounded-[24px] border border-border-ontrip-strong bg-surface-ontrip-raised p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-accent-ontrip">
        Needs attention
      </Text>
      {blockers.map((blocker) => (
        <View
          key={blocker.id}
          className="rounded-[18px] border border-border-ontrip bg-surface-ontrip px-4 py-3"
        >
          <Text className="text-sm font-semibold text-ontrip">{blocker.title}</Text>
          <Text className="mt-1 text-sm text-ontrip-muted">{blocker.detail}</Text>
        </View>
      ))}
    </View>
  );
}

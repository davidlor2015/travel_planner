import { Text, View } from "react-native";

import type { TripOnTripBlocker } from "../types";

export function NeedsAttentionCard({ blockers }: { blockers: TripOnTripBlocker[] }) {
  if (blockers.length === 0) return null;

  return (
    <View className="gap-2 rounded-[24px] border border-border-exec bg-white/5 p-4">
      <Text className="text-[11px] uppercase tracking-[1.3px] text-accent-ontrip">
        Needs attention
      </Text>
      {blockers.map((blocker) => (
        <View
          key={blocker.id}
          className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-on-dark">{blocker.title}</Text>
          <Text className="mt-1 text-sm text-on-dark-muted">{blocker.detail}</Text>
        </View>
      ))}
    </View>
  );
}

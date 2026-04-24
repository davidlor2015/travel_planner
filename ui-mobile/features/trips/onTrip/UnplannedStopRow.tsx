import { Pressable, Text, View } from "react-native";

import type { OnTripViewModel } from "./adapters";

type Props = {
  stop: OnTripViewModel["unplanned"][number];
  onDelete?: () => void;
};

export function UnplannedStopRow({ stop, onDelete }: Props) {
  const meta = [stop.location, stop.time].filter(Boolean).join(" · ");
  return (
    <View className="flex-row items-center gap-3 rounded-[22px] border border-border-ontrip bg-surface-ontrip-raised px-4 py-4">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ontrip">{stop.title}</Text>
        {meta ? (
          <Text className="mt-1 text-sm text-ontrip-muted">{meta}</Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} disabled={stop.isPending} hitSlop={8}>
          <Text className="text-sm font-semibold text-ontrip-muted">
            {stop.isPending ? "…" : "Remove"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

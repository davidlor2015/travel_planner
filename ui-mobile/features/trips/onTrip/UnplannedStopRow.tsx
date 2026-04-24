import { Pressable, Text, View } from "react-native";

import type { OnTripViewModel } from "./adapters";

type Props = {
  stop: OnTripViewModel["unplanned"][number];
  onDelete?: () => void;
};

export function UnplannedStopRow({ stop, onDelete }: Props) {
  return (
    <View className="flex-row items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-on-dark">{stop.title}</Text>
        <Text className="mt-1 text-sm text-on-dark-muted">
          {[stop.location, stop.time].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} disabled={stop.isPending}>
          <Text className="text-sm font-semibold text-on-dark-soft">
            {stop.isPending ? "…" : "Delete"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

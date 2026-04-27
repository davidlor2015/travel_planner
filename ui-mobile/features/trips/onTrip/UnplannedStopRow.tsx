import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

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
        <Text className="text-sm text-ontrip" style={fontStyles.uiSemibold}>
          {stop.title}
        </Text>
        {meta ? (
          <Text className="mt-1 text-sm text-ontrip-muted" style={fontStyles.uiRegular}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} disabled={stop.isPending} hitSlop={8}>
          <Text className="text-sm text-ontrip-muted" style={fontStyles.uiSemibold}>
            {stop.isPending ? "…" : "Remove"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  title: string;
  readOnly: boolean;
  dayLabel?: string;
  progressLabel?: string;
  onBack: () => void;
};

export function OnTripHeader({
  title,
  readOnly,
  dayLabel,
  progressLabel,
  onBack,
}: Props) {
  return (
    <View className="border-b border-border-ontrip bg-surface-ontrip-raised px-4 py-3">
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-border-ontrip-strong bg-surface-ontrip"
        >
          <Text className="text-2xl text-ontrip">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ontrip-muted">
            {dayLabel ?? "On-Trip"}
          </Text>
          <Text
            className="mt-1 text-[30px] text-ontrip"
            style={fontStyles.displaySemibold}
          >
            {title}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {readOnly ? (
              <View className="rounded-full border border-border-ontrip-strong bg-surface-ontrip px-3 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ontrip-muted">
                  Read-only
                </Text>
              </View>
            ) : null}
            {progressLabel ? (
              <View className="rounded-full border border-border-ontrip-strong bg-surface-ontrip px-3 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ontrip-muted">
                  {progressLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

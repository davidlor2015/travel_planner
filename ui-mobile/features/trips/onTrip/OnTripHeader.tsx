import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  readOnly: boolean;
  progressLabel?: string;
  onBack: () => void;
};

export function OnTripHeader({ title, readOnly, progressLabel, onBack }: Props) {
  return (
    <View className="border-b border-white/10 px-4 py-3">
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <Text className="text-2xl text-on-dark">‹</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-[11px] uppercase tracking-[1.5px] text-on-dark-soft">
            On-Trip
          </Text>
          <Text className="mt-1 text-2xl font-semibold text-on-dark">{title}</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {readOnly ? (
              <View className="rounded-full border border-white/15 bg-white/8 px-3 py-1">
                <Text className="text-[11px] uppercase tracking-[0.6px] text-on-dark-muted">
                  Read-only
                </Text>
              </View>
            ) : null}
            {progressLabel ? (
              <View className="rounded-full border border-white/15 bg-white/8 px-3 py-1">
                <Text className="text-[11px] uppercase tracking-[0.6px] text-on-dark-muted">
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

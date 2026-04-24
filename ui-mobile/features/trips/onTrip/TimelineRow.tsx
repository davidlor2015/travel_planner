import { Pressable, Text, View } from "react-native";

import type { StopVM, TimelineVariant } from "./adapters";

type Props = {
  stop: StopVM;
  variant: TimelineVariant;
  isLast: boolean;
  onConfirm?: () => void;
  onSkip?: () => void;
};

export function TimelineRow({
  stop,
  variant,
  isLast,
  onConfirm,
  onSkip,
}: Props) {
  const dotClass =
    variant === "now"
      ? "h-3 w-3 bg-accent-ontrip"
      : variant === "next"
        ? "h-2.5 w-2.5 border border-on-dark-muted bg-transparent"
        : variant === "done"
          ? "h-2 w-2 bg-border-ontrip-strong"
          : "h-2 w-2 border border-on-dark-muted bg-transparent";

  return (
    <View className="flex-row gap-4">
      <View className="w-14 pt-0.5">
        <Text className="text-right text-xs uppercase tracking-[0.5px] text-ontrip-muted">
          {stop.time?.trim() || "TBD"}
        </Text>
      </View>
      <View className="items-center">
        <View className={`rounded-full ${dotClass}`} />
        {!isLast ? <View className="mt-1 w-px flex-1 bg-white/10" /> : null}
      </View>
      <View className="flex-1 pb-5">
        <Text className="text-base font-semibold text-on-dark">{stop.title ?? "Untitled stop"}</Text>
        {stop.location ? (
          <Text className="mt-1 text-sm text-on-dark-muted">{stop.location}</Text>
        ) : null}
        {variant === "next" && !stop.isReadOnly ? (
          <View className="mt-3 flex-row gap-2">
            <MiniAction label="Confirm" onPress={onConfirm} />
            <MiniAction label="Skip" onPress={onSkip} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MiniAction({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5"
    >
      <Text className="text-xs font-semibold text-on-dark">{label}</Text>
    </Pressable>
  );
}

import { Pressable, Text, View } from "react-native";

import type { StopVM, TimelineVariant } from "./adapters";

type Props = {
  stop: StopVM;
  variant: TimelineVariant;
  isLast: boolean;
  onNavigate?: () => void;
  onConfirm?: () => void;
  onSkip?: () => void;
};

export function TimelineRow({
  stop,
  variant,
  isLast,
  onNavigate,
  onConfirm,
  onSkip,
}: Props) {
  const dotClass =
    variant === "now"
      ? "h-3 w-3 bg-accent-ontrip"
      : variant === "next"
        ? "h-2.5 w-2.5 border-2 border-accent-ontrip bg-surface-ontrip-raised"
        : variant === "done"
          ? "h-2 w-2 bg-border-ontrip-strong"
          : "h-2 w-2 border border-border-ontrip-strong bg-surface-ontrip";

  const titleClass =
    variant === "done"
      ? "text-ontrip-muted line-through"
      : variant === "upcoming"
        ? "text-ontrip-strong"
        : "text-ontrip";

  const metaClass = variant === "done" ? "text-ontrip-soft" : "text-ontrip-muted";

  return (
    <View className="flex-row gap-4">
      <View className="w-14 pt-0.5">
        <Text className="text-right text-xs uppercase tracking-[0.5px] text-ontrip-muted">
          {stop.time?.trim() || "TBD"}
        </Text>
      </View>
      <View className="items-center">
        <View className={`rounded-full ${dotClass}`} />
        {!isLast ? (
          <View className="mt-1 w-px flex-1 bg-border-ontrip" />
        ) : null}
      </View>
      <View className="flex-1 pb-5">
        <Text className={`text-base font-semibold ${titleClass}`}>
          {stop.title ?? "Untitled stop"}
        </Text>
        {stop.location ? (
          <Text className={`mt-1 text-sm ${metaClass}`}>{stop.location}</Text>
        ) : null}
        {variant === "next" ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {onNavigate ? (
              <MiniAction label="Navigate" onPress={onNavigate} />
            ) : null}
            {!stop.isReadOnly && onConfirm ? (
              <MiniAction
                label={stop.effectiveStatus === "confirmed" ? "Confirmed" : "Confirm"}
                onPress={onConfirm}
                disabled={stop.isPending}
              />
            ) : null}
            {!stop.isReadOnly && onSkip ? (
              <MiniAction
                label={stop.effectiveStatus === "skipped" ? "Skipped" : "Skip"}
                onPress={onSkip}
                disabled={stop.isPending}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MiniAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      className={[
        "rounded-full border border-border-ontrip-strong bg-surface-ontrip px-3 py-1.5",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text className="text-xs font-semibold text-ontrip-strong">{label}</Text>
    </Pressable>
  );
}

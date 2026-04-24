import { Pressable, Text, View } from "react-native";

import type { StopVM } from "./adapters";

type Props = {
  stop: StopVM;
  onConfirm: () => void;
  onSkip: () => void;
};

export function HappeningNowCard({ stop, onConfirm, onSkip }: Props) {
  return (
    <View className="rounded-[28px] bg-cocoa-1 px-5 py-5 shadow-exec">
      <Text className="text-[11px] uppercase tracking-[1.7px] text-on-dark-soft">
        Happening now
      </Text>
      <Text className="mt-3 text-[28px] font-semibold text-on-dark">
        {stop.title ?? "Untitled stop"}
      </Text>
      {stop.location ? (
        <Text className="mt-2 text-sm text-on-dark-muted">
          {stop.location}
          {stop.time ? ` · ${stop.time}` : ""}
        </Text>
      ) : null}

      {!stop.isReadOnly ? (
        <View className="mt-5 flex-row gap-2">
          <ActionButton
            label={stop.effectiveStatus === "confirmed" ? "Confirmed" : "Confirm"}
            variant="primary"
            disabled={stop.isPending || !stop.stop_ref}
            onPress={onConfirm}
          />
          <ActionButton
            label={stop.effectiveStatus === "skipped" ? "Skipped" : "Skip"}
            variant="secondary"
            disabled={stop.isPending || !stop.stop_ref}
            onPress={onSkip}
          />
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant: "primary" | "secondary";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "flex-1 items-center justify-center rounded-full px-4 py-3",
        variant === "primary"
          ? "bg-on-dark"
          : "border border-white/20 bg-white/8",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text
        className={variant === "primary" ? "font-semibold text-ontrip" : "font-semibold text-on-dark"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

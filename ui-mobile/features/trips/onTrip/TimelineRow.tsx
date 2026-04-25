import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
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
  const isDone = variant === "done";
  const isNow = variant === "now";
  const isNext = variant === "next";

  return (
    <View
      className="flex-row gap-4"
      style={{ opacity: isDone ? 0.5 : 1 }}
    >
      {/* Time column */}
      <View className="w-12 pt-0.5">
        <Text
          className="text-right text-[11px] text-ontrip-muted"
          style={[
            fontStyles.uiMedium,
            isNow && { color: "#B4532A" },
          ]}
        >
          {stop.time?.trim() || "TBD"}
        </Text>
      </View>

      {/* Dot + connector line */}
      <View className="items-center" style={{ width: 14 }}>
        <DotForVariant variant={variant} />
        {!isLast ? (
          <View
            className="mt-1 w-px flex-1 bg-border-ontrip"
            style={{ borderStyle: "dashed" }}
          />
        ) : null}
      </View>

      {/* Content */}
      <View className="flex-1 pb-5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text
            className={[
              "flex-1 text-[14px] leading-5",
              isDone ? "line-through text-ontrip-muted" : isNow ? "text-ontrip" : "text-ontrip-strong",
            ].join(" ")}
            style={isDone ? fontStyles.uiRegular : fontStyles.uiSemibold}
          >
            {stop.title ?? "Untitled stop"}
          </Text>

          {/* State label */}
          {isDone ? (
            <Text
              className="text-[10px] uppercase tracking-[1.5px] text-ontrip-soft"
              style={fontStyles.uiMedium}
            >
              Done
            </Text>
          ) : isNext ? (
            <Text
              className="text-[10px] uppercase tracking-[1.5px] text-ontrip-muted"
              style={fontStyles.uiMedium}
            >
              Next
            </Text>
          ) : null}
        </View>

        {stop.location ? (
          <Text
            className="mt-0.5 text-[13px] text-ontrip-muted"
            style={fontStyles.uiRegular}
          >
            {stop.location}
          </Text>
        ) : null}

        {isNext && (
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {onNavigate ? <MiniAction label="Navigate" onPress={onNavigate} /> : null}
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
        )}
      </View>
    </View>
  );
}

function DotForVariant({ variant }: { variant: TimelineVariant }) {
  if (variant === "now") {
    return (
      <View className="mt-1.5 h-3 w-3 rounded-full bg-accent-ontrip" />
    );
  }
  if (variant === "next") {
    return (
      <View className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent-ontrip bg-surface-ontrip-raised" />
    );
  }
  if (variant === "done") {
    return (
      <View className="mt-1.5 h-2.5 w-2.5 rounded-full border border-border-ontrip-strong bg-surface-ontrip" />
    );
  }
  // upcoming
  return (
    <View className="mt-1.5 h-2 w-2 rounded-full border border-border-ontrip-strong bg-surface-ontrip" />
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
      <Text className="text-xs text-ontrip-strong" style={fontStyles.uiSemibold}>
        {label}
      </Text>
    </Pressable>
  );
}

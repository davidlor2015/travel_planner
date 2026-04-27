import { Pressable, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import type { StopVM, TimelineVariant } from "./adapters";
import {
  splitStopTimeDisplay,
  getStatusLabel,
  isStopNow,
  shouldMuteStop,
} from "./presentation";

type Props = {
  stop: StopVM;
  variant: TimelineVariant;
  isLast: boolean;
  onPress?: () => void;
};

export function TimelineRow({
  stop,
  variant,
  isLast,
  onPress,
}: Props) {
  const isNow = isStopNow(variant);
  const isMuted = shouldMuteStop(stop);
  const timeDisplay = splitStopTimeDisplay(stop.time);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row"
      style={({ pressed }) => [
        {
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: DE.rule,
          borderStyle: "dashed",
          opacity: isMuted ? 0.55 : pressed && onPress ? 0.75 : 1,
        },
      ]}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={stop.title ?? "Stop"}
      accessibilityHint={onPress ? "Tap to view stop details" : undefined}
    >
      {/* ── Time column ────────────────────────────────────────────────── */}
      <View className="w-11 items-start py-3.5">
        {timeDisplay.period ? (
          <Text
            numberOfLines={1}
            style={[
              fontStyles.monoRegular,
              {
                fontSize: 9,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: isNow ? DE.clay : DE.muted,
              },
            ]}
          >
            {timeDisplay.period}
          </Text>
        ) : null}
        {timeDisplay.clock ? (
          <Text
            numberOfLines={1}
            style={[
              isNow ? fontStyles.monoMedium : fontStyles.monoRegular,
              {
                fontSize: 12,
                letterSpacing: 0.5,
                color: isNow ? DE.clay : DE.muted,
              },
            ]}
          >
            {timeDisplay.clock}
          </Text>
        ) : null}
      </View>

      {/* ── Dot + connector ────────────────────────────────────────────── */}
      <View className="mx-3 items-center" style={{ width: 14 }}>
        <DotForVariant variant={variant} effectiveStatus={stop.effectiveStatus} />
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <View className="min-w-0 flex-1 py-3.5">
        {/* Title row */}
        <View className="min-w-0 flex-row items-center gap-2">
          <Text
            style={[
              isNow ? fontStyles.uiBold : fontStyles.uiMedium,
              {
                fontSize: 14,
                lineHeight: 21,
                flex: 1,
                color: DE.ink,
                textDecorationLine: isMuted ? "line-through" : "none",
                textDecorationColor: DE.mutedLight,
              },
            ]}
            numberOfLines={1}
          >
            {stop.title?.trim() || "Untitled stop"}
          </Text>
        </View>

        {stop.notes?.trim() && !isMuted ? (
          <Text
            style={[fontStyles.uiRegular, { fontSize: 12, lineHeight: 18, color: DE.clay, marginTop: 2 }]}
            numberOfLines={1}
          >
            <Text style={{ color: DE.clay }}>• </Text>
            {stop.notes.trim()}
          </Text>
        ) : null}
      </View>

      <View className="items-end py-3.5">
        <TimelineStatus variant={variant} status={stop.effectiveStatus} />
      </View>
    </Pressable>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DotForVariant({
  variant,
  effectiveStatus,
}: {
  variant: TimelineVariant;
  effectiveStatus: StopVM["effectiveStatus"];
}) {
  if (variant === "now") {
    return (
      <View
        className="mt-[16px] h-[14px] w-[14px] items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(184, 90, 56, 0.14)" }}
      >
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: DE.clay }} />
      </View>
    );
  }
  if (variant === "done" && effectiveStatus === "confirmed") {
    return (
      <View
        className="mt-[18px] h-3 w-3 items-center justify-center rounded-full border"
        style={{ borderColor: DE.mutedLight }}
      >
        <Text style={[fontStyles.uiMedium, { fontSize: 8, lineHeight: 9, color: DE.muted }]}>✓</Text>
      </View>
    );
  }
  if (variant === "done") {
    return (
      <View
        className="mt-[18px] h-2.5 w-2.5 rounded-full border bg-transparent"
        style={{ borderColor: DE.mutedLight }}
      />
    );
  }
  if (variant === "next") {
    return (
      <View
        className="mt-[18px] h-2.5 w-2.5 rounded-full border bg-surface-ontrip"
        style={{ borderColor: DE.mutedLight, backgroundColor: DE.ivory }}
      />
    );
  }
  return (
    <View
      className="mt-[18px] h-2.5 w-2.5 rounded-full border bg-surface-ontrip"
      style={{ borderColor: DE.mutedLight, backgroundColor: DE.ivory }}
    />
  );
}

function TimelineStatus({
  variant,
  status,
}: {
  variant: TimelineVariant;
  status: StopVM["effectiveStatus"];
}) {
  if (variant === "done") {
    return (
      <Text style={[fontStyles.monoRegular, { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: DE.sageDeep }]}>
        {status === "skipped" ? getStatusLabel(status) : "Done"}
      </Text>
    );
  }
  if (variant === "next") {
    return (
      <Text style={[fontStyles.monoRegular, { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: DE.muted }]}>
        Next
      </Text>
    );
  }
  return null;
}

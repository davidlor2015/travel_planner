import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";
import type { StopVM, TimelineVariant } from "./adapters";
import {
  splitStopTimeDisplay,
  getStatusLabel,
  getStatusTone,
  isStopNow,
  shouldMuteStop,
  type OnTripStatusTone,
} from "./presentation";

type Props = {
  stop: StopVM;
  variant: TimelineVariant;
  isLast: boolean;
  onNavigate?: () => void;
  /** Called when the user wants to confirm this stop. Omit for read-only trips. */
  onConfirm?: () => void;
  /** Called when the user wants to skip this stop. Omit for read-only trips. */
  onSkip?: () => void;
  /** Called when the user wants to revert a confirmed/skipped stop back to planned. */
  onReset?: () => void;
};

export function TimelineRow({
  stop,
  variant,
  isLast,
  onNavigate,
  onConfirm,
  onSkip,
  onReset,
}: Props) {
  const isNow = isStopNow(variant);
  const isMuted = shouldMuteStop(stop);
  const timeDisplay = splitStopTimeDisplay(stop.time);

  return (
    <View className={["flex-row", isNow ? "rounded-[14px] bg-[#FBF1E8]/70" : ""].join(" ")}>
      {/* ── Time column (two-line: period / clock) ─────────────────────── */}
      <View className="w-[52px] items-end pt-3">
        {timeDisplay.period ? (
          <Text
            numberOfLines={1}
            className={[
              "text-[10px] leading-[14px]",
              isNow ? "text-ontrip" : "text-ontrip-muted",
            ].join(" ")}
            style={fontStyles.uiRegular}
          >
            {timeDisplay.period}
          </Text>
        ) : null}
        {timeDisplay.clock ? (
          <Text
            numberOfLines={1}
            className={[
              "text-[12px] leading-[18px]",
              isNow ? "text-ontrip" : "text-ontrip-muted",
            ].join(" ")}
            style={isNow ? fontStyles.uiSemibold : fontStyles.uiMedium}
          >
            {timeDisplay.clock}
          </Text>
        ) : null}
      </View>

      {/* ── Dot + connector ────────────────────────────────────────────── */}
      <View className="mx-3 items-center" style={{ width: 14 }}>
        <DotForVariant variant={variant} effectiveStatus={stop.effectiveStatus} />
        {!isLast ? <View className="mt-1 w-px flex-1 bg-divider" /> : null}
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <View className="min-w-0 flex-1 pb-5 pt-3">
        {/* Title + Now pill */}
        <View className="min-w-0 flex-row items-center gap-2">
          <Text
            className={[
              "min-w-0 flex-1 text-[14px] leading-[21px]",
              isMuted ? "line-through text-ontrip-muted" : "text-ontrip",
            ].join(" ")}
            style={isNow ? fontStyles.uiSemibold : fontStyles.uiMedium}
            numberOfLines={1}
          >
            {stop.title?.trim() || "Untitled stop"}
          </Text>
          {isNow ? <NowPill /> : null}
        </View>

        {/* Location */}
        {stop.location ? (
          <Text
            className="mt-0.5 text-[12px] leading-[18px] text-ontrip-muted"
            style={fontStyles.uiRegular}
            numberOfLines={1}
          >
            {stop.location}
          </Text>
        ) : null}

        {/* Status controls + Navigate */}
        <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
          {stop.effectiveStatus === "planned" ? (
            // Planned: actionable Confirm / Skip buttons (or passive pill if read-only)
            <>
              {onConfirm ? (
                <Pressable
                  onPress={onConfirm}
                  disabled={stop.isPending}
                  className={[
                    "rounded-full border border-olive/40 bg-olive/10 px-2.5 py-1 active:opacity-70",
                    stop.isPending ? "opacity-50" : "",
                  ].join(" ")}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm this stop"
                >
                  <Text className="text-[11px] text-olive" style={fontStyles.uiMedium}>
                    Confirm
                  </Text>
                </Pressable>
              ) : (
                <StatusPill status={stop.effectiveStatus} />
              )}
              {onSkip ? (
                <Pressable
                  onPress={onSkip}
                  disabled={stop.isPending}
                  className={[
                    "rounded-full border border-divider bg-surface-ontrip px-2.5 py-1 active:opacity-70",
                    stop.isPending ? "opacity-50" : "",
                  ].join(" ")}
                  accessibilityRole="button"
                  accessibilityLabel="Skip this stop"
                >
                  <Text className="text-[11px] text-ontrip-muted" style={fontStyles.uiMedium}>
                    Skip
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : onReset ? (
            // Confirmed or skipped: tappable pill reverts to planned
            <Pressable
              onPress={onReset}
              disabled={stop.isPending}
              className={stop.isPending ? "opacity-50" : "active:opacity-70"}
              accessibilityRole="button"
              accessibilityLabel={`${getStatusLabel(stop.effectiveStatus)} — tap to revert`}
            >
              <StatusPill status={stop.effectiveStatus} />
            </Pressable>
          ) : (
            <StatusPill status={stop.effectiveStatus} />
          )}

          {/* Navigate sits after status controls */}
          {onNavigate ? (
            <View className="ml-1">
              <NavigateAction onPress={onNavigate} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
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
    return <View className="mt-[17px] h-3 w-3 rounded-full bg-accent-ontrip" />;
  }
  if (variant === "done" && effectiveStatus === "confirmed") {
    return <View className="mt-[18px] h-2.5 w-2.5 rounded-full bg-olive" />;
  }
  if (variant === "done") {
    return (
      <View className="mt-[18px] h-2.5 w-2.5 rounded-full border border-ontrip-soft bg-transparent" />
    );
  }
  if (variant === "next") {
    return (
      <View className="mt-[18px] h-2.5 w-2.5 rounded-full border border-accent-ontrip bg-surface-ontrip" />
    );
  }
  return (
    <View className="mt-[18px] h-2.5 w-2.5 rounded-full border border-divider bg-surface-ontrip" />
  );
}

function NowPill() {
  return (
    <View className="rounded-full bg-[#EAD7C9] px-2.5 py-0.5">
      <Text className="text-[11px] leading-[14px] text-amber" style={fontStyles.uiMedium}>
        Now
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: StopVM["effectiveStatus"] }) {
  const tone = getStatusTone(status);
  const cls = getStatusToneClass(tone);
  return (
    <View className={`rounded-full border px-2.5 py-1 ${cls.container}`}>
      <Text className={`text-[11px] leading-[14px] ${cls.text}`} style={fontStyles.uiMedium}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );
}

function getStatusToneClass(tone: OnTripStatusTone): { container: string; text: string } {
  if (tone === "confirmed") {
    return { container: "border-transparent bg-olive/15", text: "text-olive" };
  }
  if (tone === "skipped") {
    return { container: "border-divider bg-transparent", text: "text-ontrip-muted" };
  }
  return { container: "border-divider bg-cream/60", text: "text-ontrip-muted" };
}

function NavigateAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel="Navigate to this stop"
    >
      <Ionicons name="navigate-outline" size={12} color="#B86845" />
      <Text className="text-[12px] leading-[18px] text-amber" style={fontStyles.uiMedium}>
        Navigate
      </Text>
    </Pressable>
  );
}

import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";
import type { StopVM, TimelineVariant } from "./adapters";
import {
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
  const isNow = isStopNow(variant);
  const isMuted = shouldMuteStop(stop);
  const canMutate = !stop.isReadOnly && Boolean(stop.stop_ref);

  return (
    <View className={["flex-row", isNow ? "rounded-[14px] bg-[#FBF1E8]/70" : ""].join(" ")}>
      <View className="w-[46px] pt-3">
        <Text
          className={["text-right text-[12px] leading-[18px]", isNow ? "text-ontrip" : "text-ontrip-muted"].join(" ")}
          style={isNow ? fontStyles.uiSemibold : fontStyles.uiMedium}
          numberOfLines={1}
        >
          {stop.time?.trim() || "TBD"}
        </Text>
      </View>

      <View className="mx-3 items-center" style={{ width: 14 }}>
        <DotForVariant variant={variant} />
        {!isLast ? (
          <View className="mt-1 w-px flex-1 bg-divider" />
        ) : null}
      </View>

      <View className="min-w-0 flex-1 pb-5 pt-3">
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

        {stop.location ? (
          <Text
            className="mt-0.5 text-[12px] leading-[18px] text-ontrip-muted"
            style={fontStyles.uiRegular}
            numberOfLines={1}
          >
            {stop.location}
          </Text>
        ) : null}

        <View className="mt-2.5 flex-row flex-wrap items-center gap-3">
          <StatusPill status={stop.effectiveStatus} />
          {onNavigate ? <NavigateAction onPress={onNavigate} /> : null}
        </View>

        {canMutate && (onConfirm || onSkip) ? (
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {onConfirm ? (
              <MiniAction
                label={stop.effectiveStatus === "confirmed" ? "Confirmed" : "Confirm"}
                onPress={onConfirm}
                disabled={stop.isPending}
                active={stop.effectiveStatus === "confirmed"}
              />
            ) : null}
            {onSkip ? (
              <MiniAction
                label={stop.effectiveStatus === "skipped" ? "Skipped" : "Skip"}
                onPress={onSkip}
                disabled={stop.isPending}
                active={stop.effectiveStatus === "skipped"}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DotForVariant({ variant }: { variant: TimelineVariant }) {
  if (variant === "now") {
    return (
      <View className="mt-[17px] h-3 w-3 rounded-full bg-accent-ontrip" />
    );
  }
  if (variant === "done") {
    return (
      <View className="mt-[18px] h-2.5 w-2.5 rounded-full border border-divider bg-surface-ontrip" />
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
    <View className="rounded-full bg-[#EAD7C9] px-3 py-1">
      <Text className="text-[11px] leading-[14px] text-amber" style={fontStyles.uiMedium}>
        Now
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: StopVM["effectiveStatus"] }) {
  const tone = getStatusTone(status);
  const toneClass = getStatusToneClass(tone);

  return (
    <View className={`rounded-full border px-3 py-1.5 ${toneClass.container}`}>
      <Text
        className={`text-[11px] leading-[14px] tracking-[0.3px] ${toneClass.text}`}
        style={fontStyles.uiMedium}
      >
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
    return { container: "border-divider bg-transparent", text: "text-muted" };
  }
  return { container: "border-divider bg-cream/70", text: "text-ontrip" };
}

function NavigateAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1 active:opacity-70">
      <Ionicons name="navigate-outline" size={12} color="#B86845" />
      <Text className="text-[12px] leading-[18px] text-amber" style={fontStyles.uiMedium}>
        Navigate
      </Text>
    </Pressable>
  );
}

function MiniAction({
  label,
  onPress,
  disabled,
  active,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      className={[
        "rounded-full border px-3 py-1.5",
        active ? "border-olive/30 bg-olive/10" : "border-divider bg-surface-ontrip",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text
        className={["text-[11px] leading-[14px]", active ? "text-olive" : "text-ontrip-muted"].join(" ")}
        style={fontStyles.uiSemibold}
      >
        {label}
      </Text>
    </Pressable>
  );
}

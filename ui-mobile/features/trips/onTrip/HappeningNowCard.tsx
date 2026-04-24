import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { StopVM } from "./adapters";

type Props = {
  stop: StopVM;
  onNavigate?: () => void;
  onConfirm: () => void;
  onSkip: () => void;
};

export function HappeningNowCard({ stop, onNavigate, onConfirm, onSkip }: Props) {
  const isConfirmed = stop.effectiveStatus === "confirmed";
  const isSkipped = stop.effectiveStatus === "skipped";
  const disableStatus = stop.isPending || !stop.stop_ref;

  return (
    <LinearGradient
      colors={["#3A2A1F", "#2A1D13"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 26,
        paddingHorizontal: 28,
        paddingVertical: 28,
        shadowColor: "#3A2A1F",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
        elevation: 16,
      }}
    >
      {/* "• HAPPENING NOW" + current time */}
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-accent-ontrip" style={{ opacity: 0.84 }} />
          <Text className="text-[11px] font-normal uppercase tracking-[3.5px] text-on-dark-soft">
            Happening now
          </Text>
        </View>
        <Text className="text-xs text-on-dark-muted">{localTimeHHMM()}</Text>
      </View>

      {/* Stop title */}
      <Text
        className="mt-4 text-[28px] text-on-dark"
        style={fontStyles.displaySemibold}
      >
        {stop.title ?? "Untitled stop"}
      </Text>

      {/* Location + time */}
      {(stop.location?.trim() || stop.time?.trim()) ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          <Ionicons name="location-outline" size={14} color="#C9BCA8" />
          <Text className="flex-1 text-[13px] text-on-dark-muted" numberOfLines={1}>
            {[stop.location?.trim(), stop.time?.trim()].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* Full-width Navigate button */}
      {onNavigate ? (
        <Pressable
          onPress={onNavigate}
          className="mt-5 flex-row items-center justify-center gap-2 rounded-full bg-on-dark px-4 py-3 active:opacity-90"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <Ionicons name="navigate" size={16} color="#2A1D13" />
          <Text className="text-base font-semibold text-ontrip">Navigate</Text>
        </Pressable>
      ) : null}

      {/* Action row: Confirm | Skip */}
      {!stop.isReadOnly ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActionButton
            label={isConfirmed ? "Confirmed" : "Confirm"}
            variant={isConfirmed ? "filled" : "outline"}
            disabled={disableStatus}
            onPress={onConfirm}
          />
          <ActionButton
            label={isSkipped ? "Skipped" : "Skip"}
            variant="outline"
            muted={isSkipped}
            disabled={disableStatus}
            onPress={onSkip}
          />
        </View>
      ) : null}
    </LinearGradient>
  );
}

function ActionButton({
  label,
  variant,
  muted,
  disabled,
  onPress,
}: {
  label: string;
  variant: "filled" | "outline";
  muted?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const bgClass = variant === "filled" ? "bg-on-dark" : "border border-border-exec";
  const textClass =
    variant === "filled"
      ? "text-ontrip"
      : muted
        ? "text-on-dark-muted"
        : "text-on-dark-soft";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "flex-1 items-center justify-center rounded-full px-3 py-2.5",
        bgClass,
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text className={`text-sm font-semibold ${textClass}`}>{label}</Text>
    </Pressable>
  );
}

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

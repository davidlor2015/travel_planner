import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  return (
    <LinearGradient
      colors={["#3A2A1F", "#2A1D13"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#3A2A1F",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.38,
        shadowRadius: 36,
        elevation: 14,
      }}
    >
      {/* Status strip */}
      <View
        className="flex-row items-center justify-between px-5 py-3.5"
        style={{ borderBottomWidth: 1, borderBottomColor: "rgba(242,235,221,0.10)" }}
      >
        <View className="flex-row items-center gap-2">
          {/* Pulsing dot */}
          <View className="h-4 w-4 items-center justify-center">
            <Animated.View
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#B4532A",
                opacity: ringOpacity,
              }}
            />
            <View className="h-[7px] w-[7px] rounded-full bg-accent-ontrip" />
          </View>
          <Text
            className="text-[10px] uppercase tracking-[2.5px] text-on-dark-soft"
            style={fontStyles.uiMedium}
          >
            Happening now
          </Text>
        </View>
        <Text className="text-[11px] tracking-[0.5px] text-on-dark-muted" style={fontStyles.uiRegular}>
          {localTimeHHMM()}
        </Text>
      </View>

      {/* Content */}
      <View className="px-5 pt-5 pb-2">
        <Text
          className="text-[30px] leading-[1.15] text-on-dark"
          style={fontStyles.displaySemibold}
        >
          {stop.title ?? "Untitled stop"}
        </Text>

        {(stop.location?.trim() || stop.time?.trim()) ? (
          <View className="mt-3 flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={13} color="#C9BCA8" />
            <Text
              className="flex-1 text-[13px] leading-5 text-on-dark-muted"
              style={fontStyles.uiRegular}
              numberOfLines={1}
            >
              {[stop.location?.trim(), stop.time?.trim()].filter(Boolean).join(" · ")}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View className="gap-2.5 px-5 pb-5 pt-3">
        {onNavigate ? (
          <Pressable
            onPress={onNavigate}
            className="h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-on-dark active:opacity-90"
          >
            <Ionicons name="navigate" size={15} color="#2A1D13" />
            <Text className="text-[15px] text-ontrip" style={fontStyles.uiSemibold}>
              Navigate
            </Text>
          </Pressable>
        ) : null}

        {!stop.isReadOnly ? (
          <View className="flex-row gap-2">
            <ActionButton
              label={isConfirmed ? "Confirmed" : "I'm here"}
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
      </View>
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
  const bg = variant === "filled" ? "bg-on-dark" : "border border-border-exec";
  const textColor =
    variant === "filled" ? "text-ontrip" : muted ? "text-on-dark-muted" : "text-on-dark-soft";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "flex-1 items-center justify-center rounded-[12px] py-2.5",
        bg,
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text className={`text-sm ${textColor}`} style={fontStyles.uiMedium}>
        {label}
      </Text>
    </Pressable>
  );
}

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

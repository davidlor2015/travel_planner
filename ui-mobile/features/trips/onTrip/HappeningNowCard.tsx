import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import type { StopVM } from "./adapters";

type Props = {
  stop: StopVM;
  tone?: "now" | "next";
  onPress?: () => void;
  onNavigate?: () => void;
  onConfirm: () => void;
  onSkip: () => void;
};

export function HappeningNowCard({
  stop,
  tone = "now",
  onPress,
  onNavigate,
  onConfirm,
  onSkip,
}: Props) {
  const disableStatus = stop.isPending || !stop.stop_ref;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const title = formatCardTitle(stop.title);
  const description = formatCardDescription(stop);
  const stripLabel = tone === "now" ? "Happening now" : "Up next";

  const pulseUseNativeDriver = Platform.OS !== "web";

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: pulseUseNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: pulseUseNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, pulseUseNativeDriver]);

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.38],
  });

  const cardSurfaceStyle =
    Platform.OS === "web"
      ? {
          borderRadius: 20,
          backgroundColor: DE.ink,
          boxShadow: "0px 14px 32px rgba(35, 25, 16, 0.36)",
        }
      : {
          borderRadius: 20,
          overflow: "hidden" as const,
          backgroundColor: DE.ink,
          shadowColor: DE.ink,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.36,
          shadowRadius: 32,
          elevation: 14,
        };

  return (
    <Pressable onPress={onPress} style={cardSurfaceStyle}>
      {/* Status strip */}
      <View
        className="flex-row items-center justify-between px-5 py-3.5"
        style={{ borderBottomWidth: 1, borderBottomColor: "rgba(242, 235, 221, 0.12)" }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-4 w-4 items-center justify-center">
            <Animated.View
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: DE.clay,
                opacity: ringOpacity,
              }}
            />
            <View
              className="h-[7px] w-[7px] rounded-full"
              style={{ backgroundColor: DE.clay }}
            />
          </View>
          <Text
            style={[
              fontStyles.monoMedium,
              { fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", color: DE.claySoft },
            ]}
          >
            {stripLabel}
          </Text>
        </View>
        <Text style={[fontStyles.monoRegular, { fontSize: 11, color: DE.mutedLight, letterSpacing: 1.2 }]}>
          {stop.time?.trim() || localTimeHHMM()}
        </Text>
      </View>

      {/* Content — tap this area to open detail */}
      <View className="px-5 pt-6 pb-2">
        <Text
          style={[
            fontStyles.headMediumItalic,
            { fontSize: 30, lineHeight: 35, color: DE.ivory, letterSpacing: -0.6 },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text
            className="mt-3"
            style={[
              fontStyles.uiRegular,
              { fontSize: 13, lineHeight: 20, color: "rgba(242, 235, 221, 0.70)" },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}

        <View
          className="mt-5 flex-row items-center rounded-[10px] px-3.5 py-3"
          style={{ backgroundColor: "rgba(242, 235, 221, 0.06)" }}
        >
          <MetaItem label={tone === "now" && stop.time ? `Since ${stop.time}` : stop.time ? `At ${stop.time}` : "Time TBD"} />
          <View className="mx-3 h-3 w-px" style={{ backgroundColor: "rgba(242, 235, 221, 0.18)" }} />
          <MetaItem label={stop.location?.trim() ? "Open route" : "Add location"} />
          <View className="mx-3 h-3 w-px" style={{ backgroundColor: "rgba(242, 235, 221, 0.18)" }} />
          <MetaItem label={tone === "now" ? "Needs action" : "Coming up"} accent />
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2.5 px-5 pb-5 pt-4">
        {onNavigate ? (
          <Pressable
            onPress={onNavigate}
            className="h-[58px] flex-1 flex-row items-center justify-center gap-2 rounded-[12px] active:opacity-90"
            style={{ backgroundColor: DE.ivory }}
            accessibilityRole="button"
            accessibilityLabel="Navigate to current stop"
          >
            <Ionicons name="navigate" size={15} color={DE.ink} />
            <Text style={[fontStyles.uiSemibold, { fontSize: 15, color: DE.ink }]}>
              Navigate
            </Text>
          </Pressable>
        ) : null}

        {!stop.isReadOnly ? (
          <>
            <IconAction
              icon="close"
              label="Skip current stop"
              disabled={disableStatus}
              onPress={onSkip}
            />
            <IconAction
              icon="checkmark"
              label="Confirm current stop"
              disabled={disableStatus}
              onPress={onConfirm}
            />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatCardTitle(title: string | null | undefined): string {
  const raw = title?.trim();
  if (!raw) return "Untitled stop";
  return raw.replace(/^(breakfast|brunch|lunch|dinner|coffee|drinks|visit|tour|stop)\s+(at|in)\s+/i, "");
}

function formatCardDescription(stop: StopVM): string | null {
  const location = stop.location?.trim();
  const notes = stop.notes?.trim();
  if (location && notes) return `${location}. ${notes}`;
  return location || notes || null;
}

function MetaItem({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <Text
      className="min-w-0 flex-1"
      style={[fontStyles.uiMedium, { fontSize: 12, color: accent ? DE.claySoft : "rgba(242, 235, 221, 0.75)" }]}
      numberOfLines={2}
    >
      {label}
    </Text>
  );
}

function IconAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 58,
        height: 58,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: "rgba(242, 235, 221, 0.10)",
        opacity: disabled ? 0.5 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={17} color={DE.ivory} />
    </Pressable>
  );
}

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

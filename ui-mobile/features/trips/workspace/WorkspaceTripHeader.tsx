import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { TripSummaryViewModel, TripWorkspaceViewModel } from "./adapters";
import { getTripImageUrl, getTripTagline } from "./helpers/tripVisuals";

type Props = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  onTripPress: () => void;
  onEditPress: () => void;
};

function buildCountdownLabel(trip: TripWorkspaceViewModel): {
  label: string;
  dotColor: string;
} | null {
  if (trip.status === "active") {
    return { label: "In Progress", dotColor: "#4ADE80" };
  }
  if (trip.status === "upcoming") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // dateRange is formatted; parse start from raw fields is unavailable here,
    // so derive from the dateRange string as a best-effort display.
    return { label: "Upcoming", dotColor: "#FCD34D" };
  }
  return null;
}

function buildStats(
  trip: TripWorkspaceViewModel,
  summary: TripSummaryViewModel | null,
): Array<{ label: string; sub: string }> {
  const budgetPct =
    summary?.budgetLimit && summary.budgetLimit > 0
      ? `${Math.round((summary.budgetSpent / summary.budgetLimit) * 100)}%`
      : "—";

  const packingPct =
    summary?.packingProgress != null && summary.packingTotal > 0
      ? `${Math.round(summary.packingProgress)}%`
      : "—";

  return [
    { label: `${trip.durationDays}d`, sub: "Duration" },
    { label: summary != null ? String(summary.reservationCount) : "—", sub: "Bookings" },
    { label: budgetPct, sub: "Budget" },
    { label: packingPct, sub: "Packed" },
  ];
}

export function WorkspaceTripHeader({
  trip,
  summary,
  onTripPress,
  onEditPress,
}: Props) {
  const imageUrl = getTripImageUrl({ id: trip.id, destination: trip.destination });
  const tagline = getTripTagline({ destination: trip.destination, durationDays: trip.durationDays });
  const countdown = buildCountdownLabel(trip);
  const stats = buildStats(trip, summary);

  return (
    <View style={styles.container}>
      {/* Background image */}
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />

      {/* Primary dark gradient — left heavy, fades right */}
      <LinearGradient
        colors={["rgba(18,10,4,0.82)", "rgba(18,10,4,0.48)", "rgba(18,10,4,0.10)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Bottom fade for stats strip legibility */}
      <LinearGradient
        colors={["transparent", "rgba(12,6,2,0.40)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Top row: countdown pill + action buttons */}
        <View className="flex-row items-start justify-between">
          <View>
            {countdown ? (
              <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: countdown.dotColor }}
                />
                <Text className="text-[11px] font-semibold text-white/85">
                  {countdown.label}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Glass action buttons */}
          <View className="flex-row items-center gap-2">
            <GlassButton
              icon="people-outline"
              onPress={onTripPress}
              accessibilityLabel="Manage group"
            />
            <GlassButton
              icon="pencil-outline"
              onPress={onEditPress}
              accessibilityLabel="Edit trip"
            />
          </View>
        </View>

        {/* Bottom: title + meta + stats */}
        <View className="gap-3">
          {/* Title + tagline */}
          <View>
            <Text
              className="text-ivory leading-tight"
              style={[fontStyles.displaySemibold, { fontSize: 32 }]}
              numberOfLines={2}
            >
              {trip.title}
            </Text>
            <Text
              className="mt-0.5 text-[13px] italic text-white/55"
              style={fontStyles.displayMedium}
            >
              {tagline}
            </Text>
          </View>

          {/* Destination + date metadata */}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <MetaItem icon="location-outline" text={trip.destination} />
            <MetaItem icon="calendar-outline" text={trip.dateRange} />
          </View>

          {/* Stats strip */}
          <View
            className="flex-row gap-6 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" }}
          >
            {stats.map((stat) => (
              <View key={stat.sub}>
                <Text
                  className="text-white"
                  style={[fontStyles.displaySemibold, { fontSize: 17, lineHeight: 20 }]}
                >
                  {stat.label}
                </Text>
                <Text className="text-[10px] text-white/40" style={{ letterSpacing: 0.3 }}>
                  {stat.sub}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function GlassButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="h-9 w-9 items-center justify-center rounded-xl active:opacity-80"
      style={{
        backgroundColor: "rgba(255,255,255,0.10)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
      }}
    >
      <Ionicons name={icon} size={15} color="rgba(255,255,255,0.85)" />
    </Pressable>
  );
}

function MetaItem({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.55)" />
      <Text className="text-[12px] text-white/55" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    minHeight: 240,
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 16,
  },
});

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
    return { label: "Upcoming", dotColor: "#FCD34D" };
  }
  return null;
}

function buildStats(
  trip: TripWorkspaceViewModel,
  summary: TripSummaryViewModel | null,
): { label: string; sub: string }[] {
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
        colors={["rgba(18,10,4,0.88)", "rgba(18,10,4,0.58)", "rgba(18,10,4,0.18)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Bottom fade for stats strip legibility */}
      <LinearGradient
        colors={["transparent", "rgba(12,6,2,0.56)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Top row: countdown pill + action buttons */}
        <View className="flex-row items-start justify-between gap-3">
          <View>
            {countdown ? (
              <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
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
          <View className="max-w-[92%]">
            <Text
              className="text-ivory leading-tight"
              style={[fontStyles.displaySemibold, { fontSize: 34, lineHeight: 38 }]}
              numberOfLines={2}
            >
              {trip.title}
            </Text>
            <Text
              className="mt-0.5 text-[13px] italic text-white/55"
              style={fontStyles.displayMedium}
              numberOfLines={1}
            >
              {tagline}
            </Text>
            <Text className="mt-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-white/40">
              Live trip workspace · itinerary + logistics
            </Text>
          </View>

          {/* Destination + date metadata */}
          <View className="flex-row flex-wrap gap-x-3 gap-y-2">
            <MetaItem icon="location-outline" text={trip.destination} />
            <MetaItem icon="calendar-outline" text={trip.dateRange} />
          </View>

          {/* Stats strip */}
          <View
            className="flex-row flex-wrap gap-x-6 gap-y-2 pt-3"
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
      className="h-10 w-10 items-center justify-center rounded-xl active:opacity-80"
      style={{
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    >
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.88)" />
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
    <View className="max-w-full flex-row items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.55)" />
      <Text className="text-[12px] font-medium text-white/60" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 268,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    minHeight: 268,
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 18,
  },
});

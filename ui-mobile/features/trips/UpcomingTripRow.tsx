// Path: ui-mobile/features/trips/UpcomingTripRow.tsx
// Summary: Implements UpcomingTripRow module logic.

import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

import type { UpcomingTripViewModel } from "./adapters";

type Props = {
  trip: UpcomingTripViewModel;
  onPress: () => void;
  onOpenWorkspace: () => void;
};

export function UpcomingTripRow({ trip, onPress, onOpenWorkspace }: Props) {
  const isConfirmed = trip.statusPill === "Confirmed";

  const pillBg = isConfirmed ? "#7A8B6E33" : "#231910";
  const pillText = isConfirmed ? "#7A8B6E" : "#FEFCF9";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row active:opacity-80"
      style={{
        borderRadius: 16,
        padding: 14,
        backgroundColor: "#FAF5EA",
        borderWidth: 1,
        borderColor: "#EAE2D6",
        gap: 14,
      }}
    >
      {/* Thumbnail */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 12,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Image
          source={{ uri: trip.imageUrl }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Content */}
      <View className="flex-1" style={{ gap: 4 }}>
        {/* Status pill + readiness label */}
        <View className="flex-row items-center justify-between">
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 100,
              backgroundColor: pillBg,
            }}
          >
            <Text
              style={[
                fontStyles.uiSemibold,
                { fontSize: 10, color: pillText, letterSpacing: 0.3 },
              ]}
            >
              {trip.statusPill}
            </Text>
          </View>
          <Text
            style={[
              textScaleStyles.caption,
              { color: "#8A7E74", fontSize: 9.5, letterSpacing: 1.2 },
            ]}
          >
            READINESS {trip.readinessPct}%
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[
            fontStyles.headMedium,
            {
              fontSize: 22,
              color: "#231910",
              letterSpacing: -0.4,
              lineHeight: 25,
            },
          ]}
          numberOfLines={2}
        >
          {trip.title}
        </Text>

        {/* Date + travelers */}
        <Text
          style={[
            fontStyles.uiRegular,
            { fontSize: 12, color: "#8A7E74" },
          ]}
        >
          {trip.dateRange} · {trip.memberCount}{" "}
          {trip.memberCount === 1 ? "traveler" : "travelers"}
        </Text>

        {/* Readiness bar + open link */}
        <View className="flex-row items-center" style={{ marginTop: 4, gap: 14 }}>
          <View
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: "#EAE2D6",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${trip.readinessPct}%`,
                height: "100%",
                backgroundColor: trip.readinessPct >= 80 ? "#7A8B6E" : "#B85A38",
                borderRadius: 2,
              }}
            />
          </View>
          <Pressable onPress={onOpenWorkspace} hitSlop={8} accessibilityLabel="Open plan">
            <Text
              style={[
                fontStyles.uiSemibold,
                { fontSize: 12, color: "#B85A38" },
              ]}
            >
              Open ›
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { UpcomingTripViewModel } from "./adapters";

type Props = {
  trip: UpcomingTripViewModel;
  onPress: () => void;
  onOpenWorkspace: () => void;
};

export function UpcomingTripRow({ trip, onPress, onOpenWorkspace }: Props) {
  const isConfirmed = trip.statusPill === "Confirmed";

  return (
    <Pressable
      onPress={onPress}
      className="flex-row gap-3 active:opacity-80"
    >
      {/* Thumbnail */}
      <View className="overflow-hidden rounded-[12px]" style={{ width: 60, height: 68 }}>
        <Image
          source={{ uri: trip.imageUrl }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Content */}
      <View className="flex-1 justify-center gap-1">
        {/* Status pill + readiness */}
        <View className="flex-row items-center justify-between">
          <View
            className={[
              "self-start rounded-full border px-2 py-0.5",
              isConfirmed
                ? "border-olive/25 bg-olive/10"
                : "border-amber/30 bg-amber/10",
            ].join(" ")}
          >
            <Text
              className={[
                "text-[11px] font-semibold",
                isConfirmed ? "text-olive" : "text-amber",
              ].join(" ")}
            >
              {trip.statusPill}
            </Text>
          </View>
          <Text className="text-[11px] text-text-soft">
            Readiness {trip.readinessPct}%
          </Text>
        </View>

        {/* Trip title */}
        <Text
          className="text-[16px] leading-[20px] text-text"
          style={fontStyles.displaySemibold}
          numberOfLines={1}
        >
          {trip.title}
        </Text>

        {/* Date range */}
        <Text className="text-[12px] text-text-muted">{trip.dateRange}</Text>

        {/* Open workspace link */}
        <Pressable onPress={onOpenWorkspace} hitSlop={6}>
          <Text className="text-[12px] font-semibold text-amber">
            Open workspace ›
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

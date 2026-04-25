import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { ActiveTripViewModel } from "./adapters";

type Props = {
  trip: ActiveTripViewModel;
  onOpenWorkspace: () => void;
  onOpenOnTrip: () => void;
};

export function ActiveTripHeroCard({ trip, onOpenWorkspace, onOpenOnTrip }: Props) {
  return (
    <View className="mx-4 overflow-hidden rounded-[24px]">
      {/* ── Image + gradient ── */}
      <View style={{ height: 220 }}>
        <Image
          source={{ uri: trip.imageUrl }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={250}
        />
        <LinearGradient
          colors={["transparent", "rgba(28,17,8,0.55)", "rgba(28,17,8,0.90)"]}
          locations={[0.2, 0.6, 1]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180 }}
        />

        {/* Meta + title overlaid on gradient */}
        <View className="absolute bottom-0 left-0 right-0 gap-1 p-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.65)" />
            <Text className="text-[12px] text-white/65">{trip.country}</Text>
            <Text className="text-[12px] text-white/40"> · </Text>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.65)" />
            <Text className="text-[12px] text-white/65">{trip.dateRange}</Text>
          </View>
          <Text
            className="text-[26px] leading-[30px] text-white"
            style={fontStyles.displaySemibold}
            numberOfLines={1}
          >
            {trip.title}
          </Text>
        </View>
      </View>

      {/* ── Buttons ── */}
      <View className="flex-row gap-2 bg-espresso px-4 pb-4 pt-3">
        {trip.canOpenOnTrip && (
          <Pressable
            onPress={onOpenOnTrip}
            className="flex-1 items-center justify-center rounded-full border border-white/20 bg-white/15 py-3 active:opacity-75"
          >
            <Text className="text-[13px] font-semibold text-white">Open On-Trip</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onOpenWorkspace}
          className="flex-1 items-center justify-center rounded-full border border-white/20 bg-white/10 py-3 active:opacity-75"
        >
          <Text className="text-[13px] font-semibold text-white/90">Workspace</Text>
        </Pressable>
      </View>
    </View>
  );
}

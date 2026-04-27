// Path: ui-mobile/features/explore/FeaturedDestinationCard.tsx
// Summary: Implements FeaturedDestinationCard module logic.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { FeaturedCardViewModel } from "./types";

type Props = {
  item: FeaturedCardViewModel;
  onPress?: () => void;
};

export function FeaturedDestinationCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 overflow-hidden rounded-[20px] active:opacity-90"
      style={{ height: 196 }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
        transition={250}
      />

      {/* Gradient darkens the bottom so text reads cleanly */}
      <LinearGradient
        colors={["transparent", "rgba(28,17,8,0.52)", "rgba(28,17,8,0.82)"]}
        locations={[0.25, 0.65, 1]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140 }}
      />

      {/* Season badge */}
      <View className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/30 px-3 py-1">
        <Text className="text-[11px] font-semibold text-white/90">
          {item.season}
        </Text>
      </View>

      {/* Name + tagline */}
      <View className="absolute bottom-0 left-0 right-0 gap-1 p-4">
        <Text
          className="text-[24px] leading-[28px] text-white"
          style={fontStyles.displaySemibold}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-[12px] leading-[16px] text-white/75" numberOfLines={1}>
          {item.locationLine}
        </Text>
      </View>
    </Pressable>
  );
}

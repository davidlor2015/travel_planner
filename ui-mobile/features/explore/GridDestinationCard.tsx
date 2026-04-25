import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { GridCardViewModel } from "./types";

type Props = {
  item: GridCardViewModel;
  onPress?: () => void;
};

export function GridDestinationCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-[16px] border border-border bg-surface active:opacity-80"
    >
      <View style={{ height: 108 }}>
        <Image
          source={{ uri: item.imageUrl }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={250}
        />
      </View>
      <View className="gap-0.5 p-3">
        <Text
          className="text-[14px] leading-[18px] text-text"
          style={fontStyles.uiSemibold}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-[11px] leading-[15px] text-text-muted" numberOfLines={2}>
          {item.locationLine}
        </Text>
      </View>
    </Pressable>
  );
}

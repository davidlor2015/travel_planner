import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  eyebrow: string;
  onBack: () => void;
};

export function OnTripHeader({ eyebrow, onBack }: Props) {
  return (
    <View className="bg-surface-ontrip px-5 pb-3 pt-2">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        className="absolute left-5 top-2 z-10 flex-row items-center gap-1 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Back to trips"
      >
        <Ionicons name="chevron-back" size={16} color="#2B211A" />
        <Text className="text-[13px] leading-[19px] text-ontrip" style={fontStyles.uiMedium}>
          Trips
        </Text>
      </Pressable>
      <Text
        className="text-center text-[10px] uppercase leading-[15px] tracking-[1.8px] text-ontrip-muted"
        style={fontStyles.uiRegular}
        numberOfLines={1}
      >
        {eyebrow}
      </Text>
    </View>
  );
}

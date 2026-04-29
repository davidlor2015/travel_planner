// Path: ui-mobile/features/trips/TripsListHeader.tsx
// Summary: Implements TripsListHeader module logic.

import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  subtitle: string;
  onNewTrip: () => void;
};

export function TripsListHeader({ subtitle, onNewTrip }: Props) {
  return (
    <View className="flex-row items-start justify-between px-6 pt-5 pb-6">
      <View className="flex-1 pr-3" style={{ gap: 10 }}>
        <Text
          className="text-[38px] text-text"
          style={[fontStyles.headMedium, { lineHeight: 40, letterSpacing: -0.8 }]}
        >
          Your trips
        </Text>
        <Text
          className="text-[16px] text-text-muted"
          style={[fontStyles.headMediumItalic, { lineHeight: 22 }]}
        >
          {subtitle}
        </Text>
      </View>

      <Pressable
        onPress={onNewTrip}
        hitSlop={8}
        accessibilityLabel="New trip"
        className="h-10 w-10 items-center justify-center rounded-full bg-espresso active:opacity-70"
        style={{ marginTop: 2 }}
      >
        <Ionicons name="add" size={20} color="#FEFCF9" />
      </Pressable>
    </View>
  );
}

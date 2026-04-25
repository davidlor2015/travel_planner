import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  subtitle: string;
  onNewTrip: () => void;
};

function todayLabel(): string {
  const now = new Date();
  const day = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const date = now
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  return `${day} · ${date}`;
}

export function TripsListHeader({ subtitle, onNewTrip }: Props) {
  return (
    <View className="flex-row items-start justify-between px-4 pt-5 pb-1">
      <View className="flex-1 gap-1 pr-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-soft">
          {todayLabel()}
        </Text>
        <Text
          className="text-[30px] leading-[36px] text-text"
          style={fontStyles.displaySemibold}
        >
          Your trips.
        </Text>
        <Text className="text-[13px] leading-[18px] text-text-muted">{subtitle}</Text>
      </View>

      <Pressable
        onPress={onNewTrip}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full bg-espresso active:opacity-70"
      >
        <Ionicons name="add" size={20} color="#FEFCF9" />
      </Pressable>
    </View>
  );
}

import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";

export function LogStopFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-85"
      accessibilityRole="button"
      accessibilityLabel="Log a stop"
    >
      <View
        className="h-[52px] flex-row items-center justify-center gap-3 rounded-full bg-espresso px-5"
        style={{
          shadowColor: "#2A1D13",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.32,
          shadowRadius: 24,
          elevation: 10,
        }}
      >
        <Ionicons name="add" size={17} color="#FBF6EC" />
        <Text className="text-[14px] text-ivory" style={fontStyles.uiMedium}>
          Log a stop
        </Text>
      </View>
    </Pressable>
  );
}

import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";

export function LogStopFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-7 right-5 active:opacity-80"
      style={{
        shadowColor: "#2A1D13",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      <View className="flex-row items-center gap-2 rounded-full bg-espresso px-5 py-3">
        <Ionicons name="add" size={16} color="#F2EBDD" />
        <Text className="text-[13px] text-on-dark" style={fontStyles.uiSemibold}>
          Log stop
        </Text>
      </View>
    </Pressable>
  );
}

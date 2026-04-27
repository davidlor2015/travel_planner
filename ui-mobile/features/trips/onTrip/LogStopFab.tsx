// Path: ui-mobile/features/trips/onTrip/LogStopFab.tsx
// Summary: Implements LogStopFab module logic.

import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DE } from "@/shared/theme/desertEditorial";
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
        className="h-[58px] flex-row items-center justify-center gap-3 rounded-full px-5"
        style={
          Platform.OS === "web"
            ? {
                backgroundColor: DE.ink,
                boxShadow: "0px 12px 24px rgba(35, 25, 16, 0.32)",
              }
            : {
                backgroundColor: DE.ink,
                shadowColor: DE.ink,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.32,
                shadowRadius: 24,
                elevation: 10,
              }
        }
      >
        <Ionicons name="add" size={17} color={DE.ivory} />
        <Text className="text-[14px]" style={[fontStyles.uiSemibold, { color: DE.ivory }]}>
          Log a stop
        </Text>
      </View>
    </Pressable>
  );
}

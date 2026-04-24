import { Pressable, Text } from "react-native";

export function LogStopFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-7 right-5 rounded-full bg-accent-ontrip px-5 py-3"
    >
      <Text className="text-sm font-semibold text-on-dark">Log stop</Text>
    </Pressable>
  );
}

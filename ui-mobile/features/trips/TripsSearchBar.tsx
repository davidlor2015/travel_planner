// Path: ui-mobile/features/trips/TripsSearchBar.tsx
// Summary: Implements TripsSearchBar module logic.

import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function TripsSearchBar({ value, onChangeText }: Props) {
  return (
    <View className="mx-4 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <Ionicons name="search-outline" size={15} color="#8A7E74" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search trips, places, dates"
        placeholderTextColor="#8A7E74"
        className="flex-1 text-[14px] text-text"
        style={fontStyles.uiRegular}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}

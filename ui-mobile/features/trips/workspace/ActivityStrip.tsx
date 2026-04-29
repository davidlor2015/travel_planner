import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { TripActivityItem } from "@/features/trips/types";
import { fontStyles } from "@/shared/theme/typography";

import { formatActivitySentence } from "./tripActivityModel";

type Props = {
  items: TripActivityItem[];
  unseenCount: number;
  onPress: () => void;
  errorMessage?: string | null;
};

export function ActivityStrip({ items, unseenCount, onPress, errorMessage }: Props) {
  const snippets = items.slice(0, 2);
  const title =
    unseenCount > 0
      ? `${unseenCount} change${unseenCount === 1 ? "" : "s"} since you last opened`
      : "Recent trip activity";

  return (
    <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
      <Pressable
        onPress={onPress}
        className="active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Open What changed activity list"
      >
        <View
          style={{
            borderRadius: 16,
            backgroundColor: "#FAF5EA",
            borderWidth: 1,
            borderColor: "rgba(35,25,16,0.10)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[fontStyles.monoRegular, { fontSize: 10, color: "#8A7B6A", letterSpacing: 1.6, textTransform: "uppercase" }]}>
              What changed
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#8A7B6A" />
          </View>

          <Text style={[fontStyles.uiSemibold, { fontSize: 13.5, color: "#231910" }]}>
            {title}
          </Text>

          {errorMessage ? (
            <Text style={[fontStyles.uiRegular, { fontSize: 12, color: "#8A7B6A" }]}>
              {errorMessage}
            </Text>
          ) : snippets.length > 0 ? (
            snippets.map((item) => (
              <Text
                key={item.id}
                style={[fontStyles.uiRegular, { fontSize: 12, color: "#6B5E52" }]}
                numberOfLines={1}
              >
                {formatActivitySentence(item)}
              </Text>
            ))
          ) : (
            <Text style={[fontStyles.uiRegular, { fontSize: 12, color: "#8A7B6A" }]}>
              No recent changes yet.
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

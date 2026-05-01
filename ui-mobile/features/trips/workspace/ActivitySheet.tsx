import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import type { TripActivityItem } from "@/features/trips/types";
import { fontStyles } from "@/shared/theme/typography";

import { formatActivitySentence, formatActivityTimestamp } from "./tripActivityModel";

type Props = {
  visible: boolean;
  items: TripActivityItem[];
  errorMessage?: string | null;
  onClose: () => void;
};

export function ActivitySheet({ visible, items, errorMessage, onClose }: Props) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="max-h-[80%] rounded-t-[28px] bg-bg-app px-4 pb-6 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-xl text-text" style={fontStyles.uiSemibold}>
                What changed
              </Text>
              <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                Recent trip activity
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-full border border-border px-4 py-2.5 active:opacity-75"
              accessibilityRole="button"
              accessibilityLabel="Close activity list"
            >
              <Text style={[fontStyles.uiSemibold, { fontSize: 12, color: "#6B5E52" }]}>
                Close
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-2 py-2">
            {errorMessage ? (
              <Text style={[fontStyles.uiRegular, { fontSize: 13, color: "#8A7B6A" }]}>
                {errorMessage}
              </Text>
            ) : items.length === 0 ? (
              <Text style={[fontStyles.uiRegular, { fontSize: 13, color: "#8A7B6A" }]}>
                No recent changes yet.
              </Text>
            ) : (
              items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(35,25,16,0.10)",
                    backgroundColor: "#FAF5EA",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 4,
                  }}
                >
                  <Text style={[fontStyles.uiSemibold, { fontSize: 13, color: "#231910" }]}>
                    {formatActivitySentence(item)}
                  </Text>
                  <Text style={[fontStyles.uiRegular, { fontSize: 12, color: "#8A7B6A" }]}>
                    {formatActivityTimestamp(item.createdAt)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

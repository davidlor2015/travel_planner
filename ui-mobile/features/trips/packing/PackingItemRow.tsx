import { Pressable, Text, View } from "react-native";

import type { PackingItem } from "./api";

type Props = {
  item: PackingItem;
  onToggle: () => void;
  onDelete: () => void;
};

export function PackingItemRow({ item, onToggle, onDelete }: Props) {
  return (
    <View className="flex-row items-center gap-3 rounded-[22px] border border-border bg-white px-4 py-4">
      <Pressable
        className={`h-[22px] w-[22px] items-center justify-center rounded border-2 ${item.checked ? "border-text bg-text" : "border-border"}`}
        onPress={onToggle}
      >
        {item.checked ? <Text className="text-[13px] font-bold text-white">✓</Text> : null}
      </Pressable>
      <Text
        className={`flex-1 text-[15px] ${item.checked ? "text-text-soft line-through" : "text-text"}`}
      >
        {item.label}
      </Text>
      <Pressable onPress={onDelete}>
        <Text className="text-sm font-semibold text-text-soft">Delete</Text>
      </Pressable>
    </View>
  );
}

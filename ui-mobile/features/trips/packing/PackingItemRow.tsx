import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { PackingItem } from "./api";

type Props = {
  item: PackingItem;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  isEditing?: boolean;
  editDraft?: string;
  onEditDraftChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  variant?: "card" | "embedded";
};

export function PackingItemRow({
  item,
  onToggle,
  onDelete,
  onStartEdit,
  isEditing = false,
  editDraft = "",
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  variant = "card",
}: Props) {
  const displayLabel = item.label.trim() || "Untitled item";

  if (isEditing) {
    return (
      <View
        className={[
          "border border-smoke bg-ivory px-4 py-3.5",
          variant === "embedded" ? "rounded-[12px]" : "rounded-[14px]",
        ].join(" ")}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="create-outline" size={14} color="#8A7E74" />
          <Text
            className="text-[10px] uppercase tracking-[1.4px] text-text-soft"
            style={fontStyles.uiSemibold}
          >
            Edit item
          </Text>
        </View>

        <TextInput
          value={editDraft}
          onChangeText={onEditDraftChange}
          placeholder="Update item"
          placeholderTextColor="#8A7E74"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => onSaveEdit?.()}
          className="mt-2 rounded-[12px] border border-border bg-white px-3.5 py-3 text-[15px] text-text"
          style={fontStyles.uiRegular}
        />

        <View className="mt-3 flex-row justify-end gap-2">
          <Pressable
            onPress={onCancelEdit}
            className="rounded-full border border-border bg-white px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Cancel editing ${displayLabel}`}
          >
            <Text className="text-[12px] text-text-soft" style={fontStyles.uiSemibold}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={onSaveEdit}
            disabled={!editDraft.trim()}
            className={[
              "rounded-full px-3 py-1.5",
              editDraft.trim() ? "bg-espresso" : "bg-smoke",
            ].join(" ")}
            accessibilityRole="button"
            accessibilityLabel={`Save ${displayLabel}`}
          >
            <Text
              className={[
                "text-[12px]",
                editDraft.trim() ? "text-on-dark" : "text-text-soft",
              ].join(" ")}
              style={fontStyles.uiSemibold}
            >
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      className={[
        "flex-row items-center gap-3 px-3.5 py-3",
        variant === "embedded"
          ? "min-h-[52px] bg-transparent"
          : "rounded-[14px] border border-smoke bg-ivory",
      ].join(" ")}
    >
      <Pressable
        className={[
          "h-[24px] w-[24px] items-center justify-center rounded-[8px] border-2",
          item.checked ? "border-olive bg-olive" : "border-border bg-white",
        ].join(" ")}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${item.checked ? "Uncheck" : "Check"} ${displayLabel}`}
      >
        {item.checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </Pressable>

      <Pressable
        className="flex-1"
        onPress={onStartEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${displayLabel}`}
      >
        <Text
          className={[
            "text-[15px]",
            item.checked ? "text-text-soft line-through" : "text-text",
          ].join(" ")}
          style={fontStyles.uiRegular}
          numberOfLines={2}
        >
          {displayLabel}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={onStartEdit}
          hitSlop={8}
          className="rounded-full p-1.5 active:bg-white"
          accessibilityRole="button"
          accessibilityLabel={`Edit ${displayLabel}`}
        >
          <Ionicons name="create-outline" size={14} color="#8A7E74" />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          className="rounded-full p-1.5 active:bg-white"
          accessibilityRole="button"
          accessibilityLabel={`Delete ${displayLabel}`}
        >
          <Ionicons name="trash-outline" size={14} color="#8A7E74" />
        </Pressable>
      </View>
    </View>
  );
}

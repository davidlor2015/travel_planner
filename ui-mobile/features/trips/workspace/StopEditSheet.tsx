import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Text, View } from "react-native";

import type { ItineraryItem } from "@/features/ai/api";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { MultilineInputField } from "@/shared/ui/MultilineInputField";
import { TextInputField } from "@/shared/ui/TextInputField";

export type StopEditPatch = Pick<
  ItineraryItem,
  "time" | "title" | "location" | "notes"
>;

type Props = {
  visible: boolean;
  item: ItineraryItem | null;
  onSave: (patch: StopEditPatch) => void;
  onDelete: () => void;
  onClose: () => void;
};

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function StopEditSheet({
  visible,
  item,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!visible) return;
    setTime(item?.time ?? "");
    setTitle(item?.title ?? "");
    setLocation(item?.location ?? "");
    setNotes(item?.notes ?? "");
  }, [item, visible]);

  function handleSave() {
    onSave({
      time: nullableText(time),
      title: title.trim() || "New stop",
      location: nullableText(location),
      notes: nullableText(notes),
    });
  }

  function handleDelete() {
    Alert.alert("Delete stop?", "This removes the stop from your local edits.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/30"
      >
        <View className="rounded-t-[28px] bg-bg px-4 pb-6 pt-4">
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
          <View className="mb-4">
            <Text className="text-lg font-semibold text-text">
              {item ? "Edit stop" : "Add stop"}
            </Text>
            <Text className="mt-1 text-sm text-text-muted">
              Changes stay local until you publish the itinerary.
            </Text>
          </View>

          <View className="gap-4">
            <TextInputField
              label="Time"
              value={time}
              onChangeText={setTime}
              placeholder="e.g. 9:00 AM"
            />
            <TextInputField
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Stop title"
            />
            <TextInputField
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
            />
            <MultilineInputField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes"
            />

            <View className="gap-3">
              <PrimaryButton label="Save stop" onPress={handleSave} fullWidth />
              {item ? (
                <SecondaryButton label="Delete stop" onPress={handleDelete} fullWidth />
              ) : null}
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

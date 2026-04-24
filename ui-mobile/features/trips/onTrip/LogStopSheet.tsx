import { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = {
  visible: boolean;
  defaultDate: string;
  disabled: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    day_date: string;
    title: string;
    time?: string | null;
    location?: string | null;
    notes?: string | null;
  }) => Promise<void>;
};

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function LogStopSheet({
  visible,
  defaultDate,
  disabled,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(localTimeHHMM());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setTime(localTimeHHMM());
    setLocation("");
    setNotes("");
  }, [visible]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="rounded-t-[28px] bg-bg-app px-4 pb-8 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>
          <Text className="text-xl font-semibold text-text">Log a stop</Text>
          <Text className="mt-1 text-sm text-text-muted">
            Capture an unplanned stop without leaving execution mode. Logged for {defaultDate}.
          </Text>
          <View className="mt-4 gap-3">
            <TextInputField label="Title" value={title} onChangeText={setTitle} placeholder="Coffee break" />
            <TextInputField label="Time" value={time} onChangeText={setTime} placeholder="16:30" />
            <TextInputField label="Location" value={location} onChangeText={setLocation} placeholder="Nearby cafe" />
            <TextInputField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
            <PrimaryButton
              label={disabled ? "Saving…" : "Save stop"}
              onPress={() =>
                void onSubmit({
                  day_date: defaultDate,
                  title: title.trim(),
                  time: time.trim() || null,
                  location: location.trim() || null,
                  notes: notes.trim() || null,
                })
              }
              disabled={disabled || !title.trim()}
              fullWidth
            />
            <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

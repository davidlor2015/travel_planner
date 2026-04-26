import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BookingIconName } from "./adapters";
import type { Reservation, ReservationPayload, ReservationType } from "./api";
import { fontStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { TextInputField } from "@/shared/ui/TextInputField";

type TypeChip = { key: ReservationType; label: string; icon: BookingIconName };

const TYPE_CHIPS: TypeChip[] = [
  { key: "flight", label: "Flight", icon: "airplane-outline" },
  { key: "hotel", label: "Stay", icon: "bed-outline" },
  { key: "train", label: "Train", icon: "train-outline" },
  { key: "bus", label: "Bus", icon: "bus-outline" },
  { key: "car", label: "Car", icon: "car-outline" },
  { key: "activity", label: "Activity", icon: "star-outline" },
  { key: "restaurant", label: "Dining", icon: "restaurant-outline" },
  { key: "other", label: "Other", icon: "bookmark-outline" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialValues?: Reservation;
  onSave: (payload: ReservationPayload) => Promise<void>;
};

export function BookingFormSheet({ visible, onClose, initialValues, onSave }: Props) {
  const isEdit = initialValues !== undefined;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReservationType>("other");
  const [provider, setProvider] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialValues) {
      setTitle(initialValues.title);
      setType(initialValues.reservation_type);
      setProvider(initialValues.provider ?? "");
      setConfirmationCode(initialValues.confirmation_code ?? "");
      setLocation(initialValues.location ?? "");
      setNotes(initialValues.notes ?? "");
      setAmount(
        initialValues.amount != null ? String(initialValues.amount) : "",
      );
    } else {
      setTitle("");
      setType("other");
      setProvider("");
      setConfirmationCode("");
      setLocation("");
      setNotes("");
      setAmount("");
    }
    setSaving(false);
    setError(null);
  }, [visible, initialValues]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const parsedAmount = amount.trim() ? parseFloat(amount.trim()) : undefined;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: trimmedTitle,
        reservation_type: type,
        provider: provider.trim() || undefined,
        confirmation_code: confirmationCode.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        amount: parsedAmount && !Number.isNaN(parsedAmount) ? parsedAmount : undefined,
      });
      onClose();
    } catch {
      setError(isEdit ? "Couldn't save changes. Try again." : "Couldn't save that booking. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/30"
        onPress={onClose}
        accessibilityLabel="Dismiss"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="bg-parchment-soft rounded-t-[24px] overflow-hidden"
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View className="h-1 w-10 rounded-full bg-smoke" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pt-2 pb-1">
            <Text style={fontStyles.displaySemibold} className="text-[20px] text-espresso">
              {isEdit ? "Edit booking" : "Add booking"}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#8A7E74" />
            </Pressable>
          </View>

          {/* Type chips */}
          <View className="gap-2">
            <Text style={fontStyles.uiMedium} className="text-[11px] text-muted uppercase tracking-widest">
              Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {TYPE_CHIPS.map((chip) => {
                  const active = type === chip.key;
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() => setType(chip.key)}
                      className={[
                        "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5",
                        active
                          ? "border-espresso bg-espresso"
                          : "border-smoke bg-white",
                      ].join(" ")}
                    >
                      <Ionicons
                        name={chip.icon satisfies BookingIconName}
                        size={12}
                        color={active ? "#FEFCF9" : "#8A7E74"}
                      />
                      <Text
                        style={fontStyles.uiMedium}
                        className={["text-[12px]", active ? "text-ivory" : "text-muted"].join(" ")}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Title */}
          <TextInputField
            label="Title"
            placeholder={
              type === "flight"
                ? "e.g. SFO → TYO"
                : type === "hotel"
                  ? "e.g. Hotel Kanra Kyoto"
                  : type === "restaurant"
                    ? "e.g. Dinner at Noma"
                    : "e.g. Tokyo Day Pass"
            }
            value={title}
            onChangeText={setTitle}
          />

          {/* Provider */}
          <TextInputField
            label={
              type === "flight"
                ? "Airline / flight number (optional)"
                : "Provider (optional)"
            }
            placeholder={type === "flight" ? "e.g. JAL 5" : "e.g. JR East"}
            value={provider}
            onChangeText={setProvider}
          />

          {/* Confirmation code */}
          <TextInputField
            label="Confirmation number (optional)"
            placeholder="e.g. ABC123"
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            autoCapitalize="characters"
          />

          {/* Location */}
          <TextInputField
            label="Location / address (optional)"
            placeholder={
              type === "hotel"
                ? "e.g. 1 Chome-1 Nishijin, Kyoto"
                : "e.g. Shinjuku Station, Tokyo"
            }
            value={location}
            onChangeText={setLocation}
          />

          {/* Notes */}
          <TextInputField
            label="Notes (optional)"
            placeholder="e.g. Early check-in requested"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {/* Amount */}
          <TextInputField
            label="Cost in USD (optional)"
            placeholder="e.g. 240"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          {/* Error */}
          {error ? (
            <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
              <Text style={fontStyles.uiRegular} className="text-[13px] text-danger">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View className="flex-row gap-2 pt-2">
            <View className="flex-1">
              <PrimaryButton
                label={saving ? "Saving…" : isEdit ? "Save changes" : "Save booking"}
                onPress={() => void handleSave()}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

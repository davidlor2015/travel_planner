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

import { formatBudgetAmount } from "@/features/trips/budget/adapters";
import { fontStyles } from "@/shared/theme/typography";
import { Button, SecondaryButton } from "@/shared/ui/Button";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = {
  visible: boolean;
  currentLimit: number | null;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
};

export function BudgetLimitSheet({
  visible,
  currentLimit,
  onClose,
  onSave,
}: Props) {
  const hasBudget = currentLimit !== null && currentLimit > 0;
  const currentBudgetAmount = hasBudget ? currentLimit : 0;
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(hasBudget ? String(currentLimit) : "");
    setError(null);
    setSaving(false);
  }, [visible, hasBudget, currentLimit]);

  const parsedAmount = Number.parseFloat(amount.trim());
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(parsedAmount);
      onClose();
    } catch {
      setError("We couldn't update the budget limit. Try again.");
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
        accessibilityRole="button"
        accessibilityLabel="Dismiss budget sheet"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="overflow-hidden rounded-t-[24px] bg-parchment-soft"
      >
        <View className="items-center pt-3 pb-1">
          <View className="h-1 w-10 rounded-full bg-smoke" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between pt-2 pb-1">
            <View className="flex-1 pr-4">
              <Text style={fontStyles.displaySemibold} className="text-[20px] text-espresso">
                {hasBudget ? "Edit budget" : "Set total budget"}
              </Text>
              <Text
                style={fontStyles.uiRegular}
                className="mt-1 text-[13px] leading-5 text-muted"
              >
                {hasBudget
                  ? `Current total budget: ${formatBudgetAmount(currentBudgetAmount)}`
                  : "Add a total budget to keep remaining spend visible at a glance."}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close budget sheet"
            >
              <Ionicons name="close" size={22} color="#8A7E74" />
            </Pressable>
          </View>

          <TextInputField
            label="Total budget"
            placeholder="e.g. 2000"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              if (error) setError(null);
            }}
          />

          {error ? (
            <View className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-3">
              <Text style={fontStyles.uiRegular} className="text-[13px] text-danger">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="flex-row gap-2 pt-2">
            <View className="flex-1">
              <Button
                label={saving ? "Saving…" : hasBudget ? "Save changes" : "Save budget"}
                onPress={() => void handleSave()}
                variant="ontrip"
                disabled={!canSave}
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

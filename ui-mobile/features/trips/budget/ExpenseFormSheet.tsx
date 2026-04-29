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

import {
  BUDGET_CATEGORY_ORDER,
  formatExpenseComposerDate,
  getBudgetCategoryMeta,
  normalizeExpenseInputDate,
  todayLocalISODate,
} from "@/features/trips/budget/adapters";
import type { ExpenseCategory } from "@/features/trips/budget/hooks";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import { Button, SecondaryButton } from "@/shared/ui/Button";
import { TextInputField } from "@/shared/ui/TextInputField";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: {
    label: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
  }) => Promise<void>;
};

export function ExpenseFormSheet({ visible, onClose, onSave }: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocalISODate());
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel("");
    setAmount("");
    setDate(todayLocalISODate());
    setCategory("other");
    setError(null);
    setSaving(false);
  }, [visible]);

  const parsedAmount = Number.parseFloat(amount.trim());
  const normalizedDate = normalizeExpenseInputDate(date);
  const canSave = label.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && !saving;
  const dateLabel = formatExpenseComposerDate(normalizedDate ?? todayLocalISODate());

  const handleSave = async () => {
    if (!normalizedDate) {
      setError("Expense date is invalid. Reset and try again.");
      setDate(todayLocalISODate());
      return;
    }
    if (!canSave) return;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        label: label.trim(),
        amount: parsedAmount,
        category,
        date: normalizedDate,
      });
      onClose();
    } catch {
      setError("We couldn't add that expense. Try again.");
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
        accessibilityLabel="Dismiss expense sheet"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="overflow-hidden rounded-t-[24px] bg-parchment-soft"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-smoke" />
          </View>

          <View className="flex-row items-center justify-between pt-2 pb-1">
            <View className="flex-1 pr-4">
              <Text style={fontStyles.displaySemibold} className="text-[20px] text-espresso">
                Add expense
              </Text>
              <Text
                style={fontStyles.uiRegular}
                className="mt-1 text-[13px] leading-5 text-muted"
              >
                Log a transaction without crowding the main budget view.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close expense sheet"
            >
              <Ionicons name="close" size={22} color="#8A7E74" />
            </Pressable>
          </View>

          <TextInputField
            label="Label"
            placeholder="e.g. Dinner in Trastevere"
            value={label}
            onChangeText={(value) => {
              setLabel(value);
              if (error) setError(null);
            }}
          />

          <TextInputField
            label="Amount"
            placeholder="Amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              if (error) setError(null);
            }}
          />

          <View className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
            <Text
              className="text-[11px] uppercase tracking-[0.5px] text-text-soft"
              style={fontStyles.monoRegular}
            >
              Date
            </Text>
            <Text className="mt-1 text-sm text-text" style={fontStyles.uiSemibold}>
              {dateLabel}
            </Text>
            <Text className="mt-1 text-[12px] text-text-soft" style={fontStyles.uiRegular}>
              Mobile expenses are saved with the current date.
            </Text>
          </View>

          <View className="gap-2">
            <Text
              className="text-[11px] uppercase tracking-[0.5px] text-text-soft"
              style={fontStyles.monoRegular}
            >
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1.5">
                {BUDGET_CATEGORY_ORDER.map((item) => {
                  const isActive = category === item;
                  const categoryMeta = getBudgetCategoryMeta(item);
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setCategory(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${categoryMeta.label} category`}
                      className={[
                        "flex-row items-center gap-1 rounded-full border px-3 py-1.5",
                        isActive ? "border-ontrip bg-ontrip" : "border-border bg-white",
                      ].join(" ")}
                    >
                      <Ionicons
                        name={categoryMeta.icon}
                        size={12}
                        color={isActive ? DE.ivory : categoryMeta.iconColor}
                      />
                      <Text
                        className={[
                          "text-[13px]",
                          isActive ? "text-on-dark" : "text-text-muted",
                        ].join(" ")}
                        style={isActive ? fontStyles.uiSemibold : fontStyles.uiRegular}
                      >
                        {categoryMeta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

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
                label={saving ? "Saving…" : "Save expense"}
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

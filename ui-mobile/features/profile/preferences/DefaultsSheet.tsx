// Path: ui-mobile/features/profile/preferences/DefaultsSheet.tsx
// Summary: Implements DefaultsSheet module logic.

import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";

import type { AppPreferences } from "./useAppPreferences";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "MXN"];

type Props = {
  visible: boolean;
  preferences: AppPreferences;
  onSave: (patch: Partial<AppPreferences>) => void;
  onClose: () => void;
};

// ─── Option chip ──────────────────────────────────────────────────────────────

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        "rounded-full border px-4 py-2 active:opacity-70",
        selected ? "border-espresso bg-espresso" : "border-border-strong bg-transparent",
      ].join(" ")}
    >
      <Text
        className={selected ? "text-[13px] text-ivory" : "text-[13px] text-espresso"}
        style={fontStyles.uiMedium}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="mb-2.5 text-[11px] uppercase tracking-[1.5px] text-flint"
      style={fontStyles.uiMedium}
    >
      {children}
    </Text>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function DefaultsSheet({ visible, preferences, onSave, onClose }: Props) {
  const [currency, setCurrency] = useState(preferences.currency);
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">(preferences.distanceUnit);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(preferences.timeFormat);

  // Sync local state from saved preferences each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setCurrency(preferences.currency);
    setDistanceUnit(preferences.distanceUnit);
    setTimeFormat(preferences.timeFormat);
  }, [visible, preferences]);

  function handleSave() {
    onSave({ currency, distanceUnit, timeFormat });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-[28px] bg-bg">
          {/* Handle */}
          <View className="mx-auto mb-4 mt-4 h-1.5 w-12 rounded-full bg-border-strong" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="mb-6">
              <Text
                className="text-[10px] uppercase tracking-[2px] text-amber"
                style={fontStyles.uiMedium}
              >
                Preferences
              </Text>
              <Text
                className="mt-1 text-[22px] text-espresso"
                style={fontStyles.displaySemibold}
              >
                Display defaults
              </Text>
              <Text
                className="mt-1 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                These settings affect how amounts, distances, and times are shown throughout the app.
              </Text>
            </View>

            {/* Currency */}
            <View className="mb-6">
              <SectionLabel>Currency</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <OptionChip
                    key={c}
                    label={c}
                    selected={currency === c}
                    onPress={() => setCurrency(c)}
                  />
                ))}
              </View>
            </View>

            {/* Distance */}
            <View className="mb-6">
              <SectionLabel>Distance</SectionLabel>
              <View className="flex-row gap-2">
                <OptionChip
                  label="Miles"
                  selected={distanceUnit === "mi"}
                  onPress={() => setDistanceUnit("mi")}
                />
                <OptionChip
                  label="Kilometers"
                  selected={distanceUnit === "km"}
                  onPress={() => setDistanceUnit("km")}
                />
              </View>
            </View>

            {/* Time format */}
            <View className="mb-8">
              <SectionLabel>Time format</SectionLabel>
              <View className="flex-row gap-2">
                <OptionChip
                  label="12-hour"
                  selected={timeFormat === "12h"}
                  onPress={() => setTimeFormat("12h")}
                />
                <OptionChip
                  label="24-hour"
                  selected={timeFormat === "24h"}
                  onPress={() => setTimeFormat("24h")}
                />
              </View>
            </View>

            {/* Actions */}
            <View className="gap-2.5">
              <PrimaryButton label="Save" onPress={handleSave} fullWidth />
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

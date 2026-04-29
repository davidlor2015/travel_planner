// Path: ui-mobile/features/profile/preferences/NotificationsSheet.tsx
// Summary: Implements NotificationsSheet module logic.

import { Modal, ScrollView, Switch, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import { SecondaryButton } from "@/shared/ui/Button";

import type { AppPreferences } from "./useAppPreferences";

type Props = {
  visible: boolean;
  preferences: AppPreferences;
  onChange: (patch: Partial<AppPreferences>) => void;
  onClose: () => void;
};

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <View className="min-w-0 flex-1">
        <Text
          className="text-[15px] leading-[21px] text-espresso"
          style={fontStyles.uiMedium}
        >
          {label}
        </Text>
        {description ? (
          <Text
            className="mt-0.5 text-[12px] leading-[17px] text-muted"
            style={fontStyles.uiRegular}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#EAE2D6", true: "#B86845" }}
        thumbColor="#FEFCF9"
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

function RowDivider() {
  return <View className="h-px bg-smoke" />;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function NotificationsSheet({ visible, preferences, onChange, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-[28px] bg-bg">
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
                Notifications
              </Text>
              <Text
                className="mt-1 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                Choose which alerts Waypoint can send you.
              </Text>
            </View>

            {/* Toggles */}
            <View className="mb-5 overflow-hidden rounded-[20px] border border-smoke bg-ivory px-4">
              <ToggleRow
                label="Trip reminders"
                description="Upcoming departures and check-ins"
                value={preferences.tripRemindersEnabled}
                onValueChange={(v) => onChange({ tripRemindersEnabled: v })}
              />
              <RowDivider />
              <ToggleRow
                label="Invite badge"
                description="Show pending trip invite counts in the app"
                value={preferences.inviteAlertsEnabled}
                onValueChange={(v) => onChange({ inviteAlertsEnabled: v })}
              />
              <RowDivider />
              <ToggleRow
                label="On-trip reminders"
                description="Stop prompts while a trip is active"
                value={preferences.onTripRemindersEnabled}
                onValueChange={(v) => onChange({ onTripRemindersEnabled: v })}
              />
            </View>

            {/* Informational note */}
            <View className="mb-6 rounded-[16px] border border-smoke bg-parchment px-4 py-3.5">
              <Text
                className="text-[12px] leading-[18px] text-flint"
                style={fontStyles.uiRegular}
              >
                Push notifications require device permission. If you&apos;ve previously denied permission, open your device settings to re-enable it.
              </Text>
            </View>

            <SecondaryButton label="Done" onPress={onClose} fullWidth />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Path: ui-mobile/features/profile/preferences/LanguageSheet.tsx
// Summary: Implements LanguageSheet module logic.

import { Linking, Modal, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { Ionicons } from "@expo/vector-icons";

import { buildLanguageSubtext } from "./preferencePresentation";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LanguageSheet({ visible, onClose }: Props) {
  const localeLabel = buildLanguageSubtext();

  function handleOpenSettings() {
    void Linking.openSettings();
  }

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

          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
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
                Language & region
              </Text>
            </View>

            {/* Current locale card */}
            <View className="mb-5 flex-row items-center gap-3 rounded-[20px] border border-smoke bg-ivory px-4 py-4">
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-parchment">
                <Ionicons name="globe-outline" size={17} color="#8A7E74" />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[13px] leading-[19px] text-flint"
                  style={fontStyles.uiMedium}
                >
                  Current setting
                </Text>
                <Text
                  className="mt-0.5 text-[15px] leading-[21px] text-espresso"
                  style={fontStyles.uiSemibold}
                  numberOfLines={1}
                >
                  {localeLabel}
                </Text>
              </View>
            </View>

            {/* Explanation */}
            <View className="mb-6 rounded-[16px] border border-smoke bg-parchment px-4 py-3.5">
              <Text
                className="text-[13px] leading-[19px] text-flint"
                style={fontStyles.uiRegular}
              >
                Roen uses your device&apos;s language and region settings for dates, times, and text. To change them, visit your device settings.
              </Text>
            </View>

            {/* Actions */}
            <View className="gap-2.5">
              <PrimaryButton
                label="Open device settings"
                onPress={handleOpenSettings}
                fullWidth
              />
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

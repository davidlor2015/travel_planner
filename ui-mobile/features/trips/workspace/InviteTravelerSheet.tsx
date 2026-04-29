// Path: ui-mobile/features/trips/workspace/InviteTravelerSheet.tsx
// Summary: Implements InviteTravelerSheet module logic.

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";

import { Button, SecondaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { TextInputField } from "@/shared/ui/TextInputField";
import { fontStyles } from "@/shared/theme/typography";

type Props = {
  visible: boolean;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
};

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function InviteTravelerSheet({
  visible,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEmail("");
    setEmailError(null);
  }, [visible]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="max-h-[88%] rounded-t-[28px] bg-bg-app">
            <ScreenHeader
              title="Invite Traveler"
              subtitle="Send a trip invite by email so they can join this workspace."
              onBack={onClose}
            />

            <ScrollView contentContainerClassName="gap-4 px-4 pb-8">
              <TextInputField
                label="Traveler email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={emailError}
              />

              {error ? (
                <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                  <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="gap-2 pt-2">
                <Button
                  label={submitting ? "Sending…" : "Send Invite"}
                  variant="ontrip"
                  disabled={submitting}
                  fullWidth
                  onPress={() => {
                    const nextError = validateEmail(email);
                    setEmailError(nextError);
                    if (nextError) return;
                    void onSubmit(email.trim());
                  }}
                />
                <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

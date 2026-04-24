import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useConfirmPasswordResetMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { PrimaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

export default function ResetPasswordPage() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const confirmPasswordResetMutation = useConfirmPasswordResetMutation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      setErrorMessage("This reset link is missing a token.");
      return;
    }
    if (!password || !confirmPassword) {
      setErrorMessage("New password and confirmation are required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage(null);

    try {
      await confirmPasswordResetMutation.mutateAsync({ token, password });
      router.replace("/(auth)/login");
    } catch (error) {
      setErrorMessage(friendlyError(error, "auth"));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 justify-center bg-bg px-4"
    >
      <View className="gap-4">
        <ScreenHeader
          title="Waypoint"
          subtitle="Choose a new password for your account."
        />

        <SectionCard
          eyebrow="Account"
          title="New password"
          description="Your reset link must still be valid to update your password."
        >
          <View className="gap-4">
            {!token ? (
              <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm font-medium text-danger">
                  This reset link is invalid or expired.
                </Text>
              </View>
            ) : null}

            <TextInputField
              label="New password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
            />

            <TextInputField
              label="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
            />

            {errorMessage ? (
              <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm font-medium text-danger">{errorMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={
                confirmPasswordResetMutation.isPending
                  ? "Updating..."
                  : "Update password"
              }
              onPress={() => void handleSubmit()}
              disabled={confirmPasswordResetMutation.isPending || !token}
              fullWidth
            />
            <Pressable onPress={() => router.replace("./forgot-password")}>
              <Text className="text-center text-sm font-semibold text-accent">
                Request a new reset link
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  );
}

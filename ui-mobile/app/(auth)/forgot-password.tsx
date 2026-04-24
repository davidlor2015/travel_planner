import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { useRequestPasswordResetMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { PrimaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

export default function ForgotPasswordPage() {
  const requestPasswordResetMutation = useRequestPasswordResetMutation();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage("Email is required.");
      return;
    }

    setErrorMessage(null);

    try {
      await requestPasswordResetMutation.mutateAsync(trimmedEmail);
      setSubmitted(true);
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
          subtitle="Request a secure link to choose a new password."
        />

        <SectionCard
          eyebrow="Account"
          title="Reset password"
          description="Enter the email address tied to your account."
        >
          <View className="gap-4">
            <TextInputField
              label="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            {errorMessage ? (
              <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm font-medium text-danger">{errorMessage}</Text>
              </View>
            ) : null}

            {submitted ? (
              <View className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3">
                <Text className="text-sm font-medium text-olive">
                  If that email exists, a reset link is ready for the account.
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              label={
                requestPasswordResetMutation.isPending
                  ? "Requesting..."
                  : "Request reset link"
              }
              onPress={() => void handleSubmit()}
              disabled={requestPasswordResetMutation.isPending}
              fullWidth
            />
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-center text-sm font-semibold text-accent">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  );
}

import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { useRegisterMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { PrimaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

export default function RegisterPage() {
  const registerMutation = useRegisterMutation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setErrorMessage("Display name, email, and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await registerMutation.mutateAsync({
        display_name: trimmedName,
        email: trimmedEmail,
        password,
      });
      setSuccessMessage("Account created. Verify your email before signing in.");
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
          subtitle="Create your account to start planning and executing trips."
        />

        <SectionCard
          eyebrow="Account"
          title="Register"
          description="Use a name your travel group can recognize."
        >
          <View className="gap-4">
            <TextInputField
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Maya"
            />

            <TextInputField
              label="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            <TextInputField
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
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
            {successMessage ? (
              <View className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3">
                <Text className="text-sm font-medium text-olive">{successMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={registerMutation.isPending ? "Creating…" : "Create Account"}
              onPress={() => void handleSubmit()}
              disabled={registerMutation.isPending}
              fullWidth
            />
            <Pressable onPress={() => router.replace("./login")}>
              <Text className="text-center text-sm font-semibold text-accent">
                Already have an account
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  );
}

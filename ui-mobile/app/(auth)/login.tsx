import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { friendlyError } from "@/shared/api/friendlyError";
import { useAuth } from "@/providers/AuthProvider";
import { PrimaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { SectionCard } from "@/shared/ui/SectionCard";
import { TextInputField } from "@/shared/ui/TextInputField";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn({ email: email.trim(), password });
      router.replace("/(tabs)/trips");
    } catch (error) {
      setErrorMessage(friendlyError(error, "auth"));
    } finally {
      setIsSubmitting(false);
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
          subtitle="Sign in to manage trips, logistics, and on-trip execution."
        />

        <SectionCard
          eyebrow="Account"
          title="Sign in"
          description="Use the same account you already use on web."
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

            <TextInputField
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
            />

            {errorMessage ? (
              <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm font-medium text-danger">{errorMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={isSubmitting ? "Signing In…" : "Sign In"}
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              fullWidth
            />
            <Pressable onPress={() => router.push("./register")}>
              <Text className="text-center text-sm font-semibold text-accent">
                Create account
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  );
}

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useRequestPasswordResetMutation } from "@/features/auth/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const requestPasswordResetMutation = useRequestPasswordResetMutation();
  const [email, setEmail] = useState(user?.email ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }

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
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 px-7"
      >
        {/* Back button */}
        <View className="flex-row items-center pb-2 pt-10">
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            className="flex-row items-center gap-1.5"
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
          >
            <Ionicons name="chevron-back" size={16} color="#8A7E74" />
            <Text
              className="text-[11px] uppercase tracking-[1.5px] text-muted"
              style={fontStyles.uiMedium}
            >
              Profile
            </Text>
          </Pressable>
        </View>

        {/* Headline */}
        <View className="mt-8">
          <Text
            className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
            style={fontStyles.uiMedium}
          >
            Security
          </Text>
          <Text
            className="text-espresso"
            style={[textScaleStyles.displayXL, { fontSize: 36, lineHeight: 40 }]}
          >
            {"Change your\npassword."}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
            {"We’ll send a secure link to your email so you can set a new password."}
          </Text>
        </View>

        {/* Email field */}
        <View className="mt-10">
          <View className="mb-6">
            <Text
              className="mb-1.5 text-[10px] uppercase tracking-[1.8px] text-muted"
              style={fontStyles.uiMedium}
            >
              Email address
            </Text>
            <TextInput
              placeholderTextColor="#8A7E74"
              selectionColor="#B86845"
              className="pb-2 text-[18px] text-espresso"
              style={[fontStyles.uiRegular, { borderBottomWidth: 1.5, borderBottomColor: "#EAE2D6" }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!submitted}
              onSubmitEditing={() => void handleSubmit()}
            />
          </View>

          {errorMessage ? (
            <View className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
              <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {submitted ? (
            <View className="rounded-xl border border-olive/20 bg-olive/10 px-4 py-3">
              <Text className="text-sm text-olive" style={fontStyles.uiMedium}>
                Check your email for a password reset link.
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-1" />

        {/* CTA */}
        <View className="pb-8">
          {!submitted ? (
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={requestPasswordResetMutation.isPending}
              className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
              style={requestPasswordResetMutation.isPending ? { opacity: 0.6 } : undefined}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
            >
              <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                {requestPasswordResetMutation.isPending ? "Sending…" : "Send reset link"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleBack}
              className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
            >
              <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                Back to profile
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

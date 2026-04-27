// Path: ui-mobile/app/(auth)/verify-email-request.tsx
// Summary: Implements verify-email-request module logic.

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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useRequestEmailVerificationMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

export default function VerifyEmailRequestPage() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const requestEmailVerificationMutation = useRequestEmailVerificationMutation();
  const [email, setEmail] = useState(initialEmail ?? "");
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
      await requestEmailVerificationMutation.mutateAsync(trimmedEmail);
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
        <View className="flex-row items-center pt-10 pb-2">
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            hitSlop={8}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons name="chevron-back" size={16} color="#8A7E74" />
            <Text
              className="text-[11px] uppercase tracking-[1.5px] text-muted"
              style={fontStyles.uiMedium}
            >
              Sign in
            </Text>
          </Pressable>
        </View>

        {/* Editorial headline */}
        <View className="mt-8">
          <Text
            className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
            style={fontStyles.uiMedium}
          >
            Check your inbox
          </Text>
          <Text
            className="text-espresso"
            style={[textScaleStyles.displayXL, { fontSize: 36, lineHeight: 40 }]}
          >
            {"Verify your\nemail."}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
            {"We'll send a fresh verification link to confirm your account."}
          </Text>
        </View>

        {/* Form field */}
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
                If that email exists and still needs verification, a link is ready.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Spacer pushes CTA down */}
        <View className="flex-1" />

        {/* CTA */}
        <View className="pb-8">
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={requestEmailVerificationMutation.isPending}
            className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
            style={requestEmailVerificationMutation.isPending ? { opacity: 0.6 } : undefined}
          >
            <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
              {requestEmailVerificationMutation.isPending
                ? "Sending…"
                : "Request verification link"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            className="mt-5 items-center"
          >
            <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
              Back to{" "}
              <Text className="text-espresso underline" style={fontStyles.uiMedium}>
                sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

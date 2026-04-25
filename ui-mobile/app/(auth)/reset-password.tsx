import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useConfirmPasswordResetMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

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
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <View className="flex-row items-center px-7 pt-10 pb-2">
            <Pressable
              onPress={() => router.replace("./forgot-password")}
              hitSlop={8}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name="chevron-back" size={16} color="#8A7E74" />
              <Text
                className="text-[11px] uppercase tracking-[1.5px] text-muted"
                style={fontStyles.uiMedium}
              >
                Back
              </Text>
            </Pressable>
          </View>

          {/* Editorial headline */}
          <View className="mt-8 px-7">
            <Text
              className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
              style={fontStyles.uiMedium}
            >
              Account recovery
            </Text>
            <Text
              className="text-espresso"
              style={[textScaleStyles.displayXL, { fontSize: 36, lineHeight: 40 }]}
            >
              {"Choose a new\npassword."}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
              Your reset link must still be valid.
            </Text>
          </View>

          {/* Token warning */}
          {!token ? (
            <View className="mx-7 mt-6 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
              <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                This reset link is invalid or expired.
              </Text>
            </View>
          ) : null}

          {/* Form fields */}
          <View className="mt-8 px-7">
            <View className="mb-6">
              <Text
                className="mb-1.5 text-[10px] uppercase tracking-[1.8px] text-muted"
                style={fontStyles.uiMedium}
              >
                New password
              </Text>
              <TextInput
                placeholderTextColor="#8A7E74"
                selectionColor="#B86845"
                className="pb-2 text-[18px] text-espresso"
                style={[fontStyles.uiRegular, { borderBottomWidth: 1.5, borderBottomColor: "#EAE2D6" }]}
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                secureTextEntry
                returnKeyType="next"
              />
            </View>
            <View className="mb-6">
              <Text
                className="mb-1.5 text-[10px] uppercase tracking-[1.8px] text-muted"
                style={fontStyles.uiMedium}
              >
                Confirm password
              </Text>
              <TextInput
                placeholderTextColor="#8A7E74"
                selectionColor="#B86845"
                className="pb-2 text-[18px] text-espresso"
                style={[fontStyles.uiRegular, { borderBottomWidth: 1.5, borderBottomColor: "#EAE2D6" }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                secureTextEntry
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
          </View>

          {/* CTA */}
          <View className="mt-8 px-7 pb-8">
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={confirmPasswordResetMutation.isPending || !token}
              className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
              style={confirmPasswordResetMutation.isPending || !token ? { opacity: 0.5 } : undefined}
            >
              <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                {confirmPasswordResetMutation.isPending ? "Updating…" : "Update password"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("./forgot-password")}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                Need a new link?{" "}
                <Text className="text-espresso underline" style={fontStyles.uiMedium}>
                  Request reset
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

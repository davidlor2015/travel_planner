// Path: ui-mobile/app/(auth)/register.tsx
// Summary: Implements register module logic.

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useRegisterMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { AuthInput, AUTH_PALETTE } from "@/shared/ui/AuthInput";
import { DisplayWordmark } from "@/shared/ui/RoenLogo";

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
      setSuccessMessage(
        "Account created. Verify your email before signing in.",
      );
    } catch (error) {
      setErrorMessage(friendlyError(error, "auth"));
    }
  }

  return (
    <SafeAreaView style={s.root}>
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
              onPress={() => router.replace("./login")}
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

          <View className="items-center px-7 pt-7">
            <DisplayWordmark width={156} />
          </View>

          {/* Editorial headline */}
          <View className="mt-7 px-7">
            <Text
              className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
              style={fontStyles.uiMedium}
            >
              Create account
            </Text>
            <Text
              className="text-espresso"
              style={[
                textScaleStyles.displayXL,
                { fontSize: 38, lineHeight: 42 },
              ]}
            >
              Join Roen.
            </Text>
          </View>

          {/* Form fields */}
          <View className="mt-8 px-7">
            <AuthInput
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Maya"
              returnKeyType="next"
            />
            <AuthInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              returnKeyType="next"
            />
            <AuthInput
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
            />

            {errorMessage ? (
              <View className="mt-1 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text
                  className="text-sm text-danger"
                  style={fontStyles.uiMedium}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-1 gap-3 rounded-xl border border-olive/20 bg-olive/10 px-4 py-3">
                <Text
                  className="text-sm text-olive"
                  style={fontStyles.uiMedium}
                >
                  {successMessage}
                </Text>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(auth)/verify-email-request",
                      params: { email: email.trim().toLowerCase() },
                    })
                  }
                >
                  <Text
                    className="text-sm text-espresso underline"
                    style={fontStyles.uiMedium}
                  >
                    Request verification link
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* CTA */}
          <View className="mt-8 px-7 pb-8">
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={registerMutation.isPending}
              className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
              style={registerMutation.isPending ? { opacity: 0.6 } : undefined}
            >
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-[15px] text-on-dark"
                  style={fontStyles.uiMedium}
                >
                  {registerMutation.isPending
                    ? "Creating account…"
                    : "Create Account"}
                </Text>
                {!registerMutation.isPending && (
                  <Ionicons name="arrow-forward" size={16} color="#F2EBDD" />
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.replace("./login")}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                Already have an account?{" "}
                <Text
                  className="text-espresso underline"
                  style={fontStyles.uiMedium}
                >
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AUTH_PALETTE.bg,
  },
});

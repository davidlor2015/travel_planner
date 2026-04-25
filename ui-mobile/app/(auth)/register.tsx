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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useRegisterMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";

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

          {/* Editorial headline */}
          <View className="mt-8 px-7">
            <Text
              className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
              style={fontStyles.uiMedium}
            >
              Create account
            </Text>
            <Text
              className="text-espresso"
              style={[textScaleStyles.displayXL, { fontSize: 38, lineHeight: 42 }]}
            >
              {"Join\nWaypoint."}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
              Use a name your travel group will recognize.
            </Text>
          </View>

          {/* Form fields */}
          <View className="mt-8 px-7">
            <UnderlineField
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Maya"
              returnKeyType="next"
            />
            <UnderlineField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <UnderlineField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              returnKeyType="next"
            />
            <UnderlineField
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
                <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-1 gap-3 rounded-xl border border-olive/20 bg-olive/10 px-4 py-3">
                <Text className="text-sm text-olive" style={fontStyles.uiMedium}>
                  {successMessage}
                </Text>
                <Pressable onPress={() => router.push("./verify-email-request")}>
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
                <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                  {registerMutation.isPending ? "Creating account…" : "Create Account"}
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
                <Text className="text-espresso underline" style={fontStyles.uiMedium}>
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

function UnderlineField({
  label,
  error,
  ...inputProps
}: {
  label: string;
  error?: string | null;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-6">
      <Text
        className="mb-1.5 text-[10px] uppercase tracking-[1.8px] text-muted"
        style={fontStyles.uiMedium}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#8A7E74"
        selectionColor="#B86845"
        className="pb-2 text-[18px] text-espresso"
        style={[fontStyles.uiRegular, { borderBottomWidth: 1.5, borderBottomColor: error ? "#881337" : "#EAE2D6" }]}
        {...inputProps}
      />
      {error ? (
        <Text className="mt-1 text-xs text-danger" style={fontStyles.uiMedium}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

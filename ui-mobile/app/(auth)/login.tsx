// Path: ui-mobile/app/(auth)/login.tsx
// Summary: Implements login module logic.

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

import { friendlyError } from "@/shared/api/friendlyError";
import { useAuth } from "@/providers/AuthProvider";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { DisplayWordmark } from "@/shared/ui/RoenLogo";
import { AuthInput, AUTH_PALETTE } from "@/shared/ui/AuthInput";

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
          {/* Logo row */}
          <View className="px-7 pt-10 pb-2">
            <DisplayWordmark width={168} />
          </View>

          <View className="h-10" />

          {/* Editorial headline */}
          <View className="px-7">
            <Text
              className="mb-1 text-[11px] uppercase text-amber"
              style={[fontStyles.uiMedium, { letterSpacing: 1.2 }]}
            >
              Welcome back
            </Text>
            <Text
              style={[
                textScaleStyles.displayXL,
                { fontSize: 38, lineHeight: 42, color: AUTH_PALETTE.text },
              ]}
            >
              {"Sign in."}
            </Text>
            <Text
              className="mt-2 text-sm leading-5 text-muted"
              style={fontStyles.uiRegular}
            >
              Pick up where you left off.
            </Text>
          </View>

          {/* Form fields */}
          <View className="mt-8 px-7">
            <AuthInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              textContentType="password"
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
          </View>

          {/* CTA */}
          <View className="mt-8 px-7 pb-8">
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              style={[s.button, isSubmitting && { opacity: 0.6 }]}
            >
              {({ pressed }) => (
                <View style={[s.buttonInner, pressed && { opacity: 0.82 }]}>
                  <Text style={[s.buttonLabel, fontStyles.uiMedium]}>
                    {isSubmitting ? "Signing in…" : "Sign In"}
                  </Text>
                  {!isSubmitting && (
                    <Ionicons name="arrow-forward" size={15} color="#F2EBDD" />
                  )}
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("./forgot-password")}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                Forgot password?{" "}
                <Text style={[fontStyles.uiMedium, s.link]}>Reset it</Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("./register")}
              className="mt-3 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                New here?{" "}
                <Text style={[fontStyles.uiMedium, s.link]}>
                  Create an account
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
  button: {
    height: 48,
    borderRadius: 16,
    backgroundColor: AUTH_PALETTE.text,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buttonLabel: {
    fontSize: 15,
    color: "#F2EBDD",
  },
  link: {
    fontSize: 14,
    color: AUTH_PALETTE.clay,
  },
});

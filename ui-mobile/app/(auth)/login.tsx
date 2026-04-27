// Path: ui-mobile/app/(auth)/login.tsx
// Summary: Implements login module logic.

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

import { friendlyError } from "@/shared/api/friendlyError";
import { useAuth } from "@/providers/AuthProvider";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { WaypointLogo } from "@/shared/ui/WaypointLogo";

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
          {/* Logo row */}
          <View className="px-7 pt-10 pb-2">
            <WaypointLogo size={24} />
          </View>

          {/* Spacer */}
          <View className="flex-1" style={{ minHeight: 48 }} />

          {/* Editorial headline */}
          <View className="px-7">
            <Text
              className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
              style={fontStyles.uiMedium}
            >
              Welcome back
            </Text>
            <Text
              className="text-espresso"
              style={[textScaleStyles.displayXL, { fontSize: 38, lineHeight: 42 }]}
            >
              {"Sign in."}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
              Pick up where you left off.
            </Text>
          </View>

          {/* Form fields */}
          <View className="mt-8 px-7">
            <UnderlineField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <UnderlineField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
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
          </View>

          {/* CTA */}
          <View className="mt-8 px-7 pb-8">
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
              style={isSubmitting ? { opacity: 0.6 } : undefined}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </Text>
                {!isSubmitting && (
                  <Ionicons name="arrow-forward" size={16} color="#F2EBDD" />
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("./forgot-password")}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                Forgot password?{" "}
                <Text className="text-espresso underline" style={fontStyles.uiMedium}>
                  Reset it
                </Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("./register")}
              className="mt-3 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                New here?{" "}
                <Text className="text-espresso underline" style={fontStyles.uiMedium}>
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

// Underline-style input — editorial feel, auth-screens only
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

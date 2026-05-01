// Path: ui-mobile/app/(auth)/verify-email.tsx
// Summary: Implements verify-email module logic.

import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useConfirmEmailVerificationMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles, textScaleStyles } from "@/shared/theme/typography";
import { RoenLogo } from "@/shared/ui/RoenLogo";

export default function VerifyEmailPage() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const confirmEmailVerificationMutation = useConfirmEmailVerificationMutation();
  const didSubmitRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (didSubmitRef.current) return;
    didSubmitRef.current = true;

    if (!token) {
      setErrorMessage("This verification link is missing a token.");
      return;
    }

    confirmEmailVerificationMutation
      .mutateAsync(token)
      .then(() => {
        setIsComplete(true);
      })
      .catch((error) => {
        setErrorMessage(friendlyError(error, "auth"));
      });
  }, [confirmEmailVerificationMutation, token]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-7">
        {/* Logo row */}
        <View className="pt-10 pb-2">
          <RoenLogo size={36} />
        </View>

        {/* Editorial headline */}
        <View className="mt-12">
          <Text
            className="mb-1 text-[11px] uppercase tracking-[1.8px] text-amber"
            style={fontStyles.uiMedium}
          >
            Confirming email
          </Text>
          <Text
            className="text-espresso"
            style={[textScaleStyles.displayXL, { fontSize: 36, lineHeight: 40 }]}
          >
            {isComplete ? "You're\nconfirmed." : "One\nmoment."}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-muted" style={fontStyles.uiRegular}>
            {isComplete
              ? "Your email is verified. Sign in to get started."
              : "Verifying your email address…"}
          </Text>
        </View>

        {/* Status cards */}
        <View className="mt-10 gap-3">
          {confirmEmailVerificationMutation.isPending ? (
            <View className="rounded-xl border border-border bg-surface-muted px-4 py-4">
              <Text className="text-center text-sm text-muted" style={fontStyles.uiRegular}>
                Confirming your email…
              </Text>
            </View>
          ) : null}

          {isComplete ? (
            <View className="rounded-xl border border-olive/20 bg-olive/10 px-4 py-3">
              <Text className="text-sm text-olive" style={fontStyles.uiMedium}>
                Email verified successfully.
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
              <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                {errorMessage}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* CTA */}
        <View className="pb-8">
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            disabled={confirmEmailVerificationMutation.isPending}
            className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
            style={confirmEmailVerificationMutation.isPending ? { opacity: 0.5 } : undefined}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-[15px] text-on-dark" style={fontStyles.uiMedium}>
                Continue to sign in
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#F2EBDD" />
            </View>
          </Pressable>

          {errorMessage ? (
            <Pressable
              onPress={() => router.replace("./verify-email-request")}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-muted" style={fontStyles.uiRegular}>
                <Text className="text-espresso underline" style={fontStyles.uiMedium}>
                  Request a new verification link
                </Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

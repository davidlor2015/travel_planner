import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useConfirmEmailVerificationMutation } from "@/features/auth/hooks";
import { friendlyError } from "@/shared/api/friendlyError";
import { PrimaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { SectionCard } from "@/shared/ui/SectionCard";

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 justify-center bg-bg px-4"
    >
      <View className="gap-4">
        <ScreenHeader
          title="Waypoint"
          subtitle="Confirming your email keeps shared trip access reliable."
        />

        <SectionCard eyebrow="Account" title="Confirm your email">
          <View className="gap-4">
            {confirmEmailVerificationMutation.isPending ? (
              <View className="rounded-2xl border border-border bg-surface-muted px-4 py-5">
                <Text className="text-center text-sm font-medium text-text-muted">
                  Confirming email...
                </Text>
              </View>
            ) : null}

            {isComplete ? (
              <View className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3">
                <Text className="text-sm font-medium text-olive">Email verified.</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm font-medium text-danger">{errorMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Continue to sign in"
              onPress={() => router.replace("/(auth)/login")}
              disabled={confirmEmailVerificationMutation.isPending}
              fullWidth
            />
            {errorMessage ? (
              <Pressable onPress={() => router.replace("./verify-email-request")}>
                <Text className="text-center text-sm font-semibold text-accent">
                  Request a new verification link
                </Text>
              </Pressable>
            ) : null}
          </View>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  );
}

// Path: ui-mobile/features/profile/EditDisplayNameSheet.tsx
// Summary: Implements EditDisplayNameSheet module logic.

import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";

import { useUpdateMeMutation } from "@/features/auth/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { friendlyError } from "@/shared/api/friendlyError";
import { fontStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";

const MAX_LENGTH = 80;

type Props = {
  visible: boolean;
  currentName: string;
  onClose: () => void;
};

export function EditDisplayNameSheet({ visible, currentName, onClose }: Props) {
  const { refreshUser } = useAuth();
  const updateMe = useUpdateMeMutation();

  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setError(null);
    }
  }, [visible, currentName]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      await updateMe.mutateAsync({ display_name: trimmed });
      await refreshUser();
      onClose();
    } catch (err) {
      setError(friendlyError(err, "profile"));
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="rounded-t-[28px] bg-bg">
          {/* Handle */}
          <View className="mx-auto mb-4 mt-4 h-1.5 w-12 rounded-full bg-border-strong" />

          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            {/* Header */}
            <View className="mb-6">
              <Text
                className="text-[10px] uppercase tracking-[2px] text-amber"
                style={fontStyles.uiMedium}
              >
                Profile
              </Text>
              <Text
                className="mt-1 text-[22px] text-espresso"
                style={fontStyles.displaySemibold}
              >
                Edit your name
              </Text>
              <Text
                className="mt-1 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                This is how you&apos;ll appear across Roen.
              </Text>
            </View>

            {/* Input */}
            <View className="mb-1.5">
              <TextInput
                ref={inputRef}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                placeholder="Your name"
                placeholderTextColor="#8A7E74"
                selectionColor="#B86845"
                autoFocus
                maxLength={MAX_LENGTH + 1}
                returnKeyType="done"
                onSubmitEditing={() => void handleSave()}
                className="rounded-[14px] border border-border bg-ivory px-4 py-3.5 text-[16px] text-espresso"
                style={fontStyles.uiRegular}
              />
            </View>

            {/* Error / char count row */}
            <View className="mb-6 flex-row items-center justify-between">
              {error ? (
                <Text
                  className="flex-1 text-[12px] text-danger"
                  style={fontStyles.uiRegular}
                >
                  {error}
                </Text>
              ) : (
                <View />
              )}
              <Text
                className={[
                  "ml-2 text-[12px]",
                  trimmed.length > MAX_LENGTH ? "text-danger" : "text-flint",
                ].join(" ")}
                style={fontStyles.uiRegular}
              >
                {trimmed.length}/{MAX_LENGTH}
              </Text>
            </View>

            {/* Actions */}
            <View className="gap-2.5">
              <PrimaryButton
                label={updateMe.isPending ? "Saving…" : "Save"}
                onPress={() => void handleSave()}
                disabled={!canSave || updateMe.isPending}
                fullWidth
              />
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

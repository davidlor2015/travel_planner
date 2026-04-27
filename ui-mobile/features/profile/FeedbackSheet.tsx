// Path: ui-mobile/features/profile/FeedbackSheet.tsx
// Summary: Implements FeedbackSheet module logic.

import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontStyles } from "@/shared/theme/typography";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";

// ─── Types & constants ────────────────────────────────────────────────────────

const FEEDBACK_CATEGORIES = [
  { key: "bug", label: "Bug report" },
  { key: "feature", label: "Feature request" },
  { key: "general", label: "General" },
  { key: "appreciation", label: "Appreciation" },
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["key"];

const RECIPIENT = "davidlor2015@gmail.com";
const MESSAGE_MIN = 10;

// ─── Mailto builder ───────────────────────────────────────────────────────────

function buildMailtoUrl(opts: {
  category: FeedbackCategory | null;
  message: string;
  userEmail: string;
}): string {
  const categoryLabel =
    FEEDBACK_CATEGORIES.find((c) => c.key === opts.category)?.label ?? "General";
  const subject = `Waypoint Feedback: ${categoryLabel}`;
  const body = [
    opts.message.trim(),
    "",
    "—",
    `Type: ${categoryLabel}`,
    opts.userEmail ? `From: ${opts.userEmail}` : null,
    "App: Waypoint Mobile",
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="mb-2.5 text-[11px] uppercase tracking-[1.5px] text-flint"
      style={fontStyles.uiMedium}
    >
      {children}
    </Text>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        "rounded-full border px-4 py-2 active:opacity-70",
        selected ? "border-espresso bg-espresso" : "border-border-strong bg-transparent",
      ].join(" ")}
    >
      <Text
        className={selected ? "text-[13px] text-ivory" : "text-[13px] text-espresso"}
        style={fontStyles.uiMedium}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  userEmail: string;
  onClose: () => void;
};

export function FeedbackSheet({ visible, userEmail, onClose }: Props) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setCategory(null);
    setMessage("");
    setErrorMessage(null);
    setSubmitted(false);
  }, [visible]);

  const messageLength = message.trim().length;
  const canSubmit = messageLength >= MESSAGE_MIN;

  async function handleSend() {
    if (!canSubmit) {
      setErrorMessage(`Please write at least ${MESSAGE_MIN} characters.`);
      return;
    }
    setErrorMessage(null);

    const url = buildMailtoUrl({ category, message, userEmail });
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      setErrorMessage(
        `Couldn't open your mail app. You can email feedback directly to ${RECIPIENT}.`,
      );
      return;
    }

    await Linking.openURL(url);
    setSubmitted(true);
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
        <View className="max-h-[92%] rounded-t-[28px] bg-bg">
          {/* Handle */}
          <View className="mx-auto mb-4 mt-4 h-1.5 w-12 rounded-full bg-border-strong" />

          {submitted ? (
            // ── Success state ──────────────────────────────────────────────
            <View
              style={{ paddingHorizontal: 20, paddingBottom: 32 }}
              className="items-center gap-5"
            >
              <View className="mt-4 h-14 w-14 items-center justify-center rounded-full bg-olive/10">
                <Ionicons name="checkmark" size={28} color="#6A7A43" />
              </View>
              <View className="items-center gap-1.5">
                <Text
                  className="text-center text-[22px] text-espresso"
                  style={fontStyles.displaySemibold}
                >
                  Thanks for the feedback.
                </Text>
                <Text
                  className="text-center text-[14px] leading-5 text-muted"
                  style={fontStyles.uiRegular}
                >
                  Your mail app should have opened with the message ready to send.
                </Text>
              </View>
              <View className="mt-2 w-full">
                <SecondaryButton label="Done" onPress={onClose} fullWidth />
              </View>
            </View>
          ) : (
            // ── Form state ────────────────────────────────────────────────
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                  Send feedback
                </Text>
                <Text
                  className="mt-1 text-[13px] leading-5 text-muted"
                  style={fontStyles.uiRegular}
                >
                  Your message will open in your mail app, ready to send.
                </Text>
              </View>

              {/* Category */}
              <View className="mb-6">
                <SectionLabel>Type (optional)</SectionLabel>
                <View className="flex-row flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <CategoryChip
                      key={c.key}
                      label={c.label}
                      selected={category === c.key}
                      onPress={() => setCategory(category === c.key ? null : c.key)}
                    />
                  ))}
                </View>
              </View>

              {/* Message */}
              <View className="mb-5">
                <SectionLabel>Message</SectionLabel>
                <Pressable
                  onPress={() => inputRef.current?.focus()}
                  className="min-h-[128px] rounded-[16px] border border-border bg-ivory px-4 pt-3 pb-3"
                >
                  <TextInput
                    ref={inputRef}
                    value={message}
                    onChangeText={(t) => {
                      setMessage(t);
                      if (errorMessage && t.trim().length >= MESSAGE_MIN) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#8A7E74"
                    selectionColor="#B86845"
                    multiline
                    textAlignVertical="top"
                    className="text-[15px] leading-[22px] text-espresso"
                    style={fontStyles.uiRegular}
                  />
                </Pressable>
                {/* Character hint */}
                <View className="mt-1.5 flex-row items-center justify-between">
                  {errorMessage ? (
                    <Text
                      className="flex-1 text-[12px] text-danger"
                      style={fontStyles.uiRegular}
                    >
                      {errorMessage}
                    </Text>
                  ) : (
                    <View />
                  )}
                  <Text
                    className={[
                      "ml-2 text-[12px]",
                      canSubmit ? "text-muted" : "text-flint",
                    ].join(" ")}
                    style={fontStyles.uiRegular}
                  >
                    {messageLength < MESSAGE_MIN
                      ? `${MESSAGE_MIN - messageLength} more to go`
                      : `${messageLength} chars`}
                  </Text>
                </View>
              </View>

              {/* Recipient note */}
              <View className="mb-6 flex-row items-center gap-2 rounded-[14px] border border-smoke bg-parchment px-3.5 py-3">
                <Ionicons name="mail-outline" size={14} color="#8A7E74" />
                <Text
                  className="flex-1 text-[12px] leading-[18px] text-flint"
                  style={fontStyles.uiRegular}
                >
                  Sends to {RECIPIENT}
                </Text>
              </View>

              {/* Actions */}
              <View className="gap-2.5">
                <PrimaryButton
                  label="Send feedback"
                  onPress={() => void handleSend()}
                  disabled={!canSubmit}
                  fullWidth
                />
                <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

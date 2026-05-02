import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { DayPlan, Itinerary } from "@/features/ai/api";
import { useRefineItineraryMutation } from "@/features/ai/hooks";
import { formatTripStopTime } from "@/features/trips/stopTime";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

type RethinkState =
  | { kind: "idle" }
  | { kind: "rethinking" }
  | { kind: "preview"; refinedItinerary: Itinerary }
  | { kind: "error"; message: string };

type Props = {
  visible: boolean;
  tripId: number;
  day: DayPlan | null;
  currentItinerary: Itinerary;
  onAccept: (refinedItinerary: Itinerary) => void;
  onClose: () => void;
};

export function RethinkDaySheet({
  visible,
  tripId,
  day,
  currentItinerary,
  onAccept,
  onClose,
}: Props) {
  const [note, setNote] = useState("");
  const [rethinkState, setRethinkState] = useState<RethinkState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const { mutateAsync: refine } = useRefineItineraryMutation();

  function handleClose() {
    abortRef.current?.abort();
    abortRef.current = null;
    setRethinkState({ kind: "idle" });
    setNote("");
    onClose();
  }

  function handleAccept() {
    if (rethinkState.kind !== "preview") return;
    onAccept(rethinkState.refinedItinerary);
    setRethinkState({ kind: "idle" });
    setNote("");
  }

  async function handleSubmit() {
    if (!day || !note.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setRethinkState({ kind: "rethinking" });

    try {
      const result = await refine({
        tripId,
        payload: {
          current_itinerary: currentItinerary,
          locked_items: [],
          favorite_items: [],
          regenerate_day_number: day.day_number,
          user_note: note.trim(),
        },
        signal: controller.signal,
      });
      setRethinkState({ kind: "preview", refinedItinerary: result });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setRethinkState({
        kind: "error",
        message: "Couldn't update this day. Your original plan is still here.",
      });
    }
  }

  if (!day) return null;

  const dayTitle = day.day_title?.trim() || `Day ${day.day_number}`;
  const isRethinking = rethinkState.kind === "rethinking";
  const isPreview = rethinkState.kind === "preview";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="rounded-t-[28px] bg-bg pt-4 pb-8">
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View>
              <Text
                className="text-[10px] uppercase tracking-[2px] text-amber"
                style={fontStyles.uiMedium}
              >
                Rethink this day
              </Text>
              <Text
                className="mt-1 text-[22px] text-espresso"
                style={fontStyles.displaySemibold}
              >
                {dayTitle}
              </Text>
              <Text
                className="mt-1 text-[13px] leading-5 text-muted"
                style={fontStyles.uiRegular}
              >
                {day.items.length} {day.items.length === 1 ? "stop" : "stops"} planned
                {day.date ? ` · ${day.date}` : ""}
              </Text>
            </View>

            {/* Note input */}
            {!isRethinking && !isPreview && (
              <View>
                <Text
                  className="mb-2 text-[11px] uppercase tracking-[1.5px] text-muted"
                  style={fontStyles.uiMedium}
                >
                  What would you like to change?
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Make this day more relaxed"
                  placeholderTextColor={DE.muted}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  accessibilityLabel="Note for rethinking this day"
                  style={[
                    fontStyles.uiRegular,
                    {
                      fontSize: 14,
                      color: DE.ink,
                      borderWidth: 1,
                      borderColor: DE.ruleStrong,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingTop: 12,
                      paddingBottom: 12,
                      minHeight: 80,
                      textAlignVertical: "top",
                      backgroundColor: DE.paper,
                    },
                  ]}
                />
              </View>
            )}

            {/* Rethinking spinner */}
            {isRethinking && (
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-4">
                <ActivityIndicator size="small" color="#B86845" />
                <View className="flex-1">
                  <Text
                    className="text-[14px] text-espresso"
                    style={fontStyles.uiSemibold}
                  >
                    Rethinking this day…
                  </Text>
                  <Text
                    className="mt-0.5 text-[12px] text-muted"
                    style={fontStyles.uiRegular}
                  >
                    This usually takes 15–30 seconds.
                  </Text>
                </View>
              </View>
            )}

            {/* Error */}
            {rethinkState.kind === "error" && (
              <Text className="text-[13px] text-danger" style={fontStyles.uiRegular}>
                {rethinkState.message}
              </Text>
            )}

            {/* Preview */}
            {isPreview && (
              <>
                <View
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "rgba(184,90,56,0.08)", borderWidth: 1, borderColor: "rgba(184,90,56,0.20)" }}
                >
                  <Text
                    className="text-[13px] leading-5 text-amber"
                    style={fontStyles.uiMedium}
                  >
                    Updated this day.
                  </Text>
                </View>
                <RethinkDayPreview
                  original={day}
                  refined={
                    rethinkState.refinedItinerary.days.find(
                      (d) => d.day_number === day.day_number,
                    ) ?? null
                  }
                />
              </>
            )}

            {/* Actions */}
            <View className="gap-2.5">
              {isPreview ? (
                <>
                  <Pressable
                    onPress={handleAccept}
                    accessibilityRole="button"
                    accessibilityLabel="Accept changes"
                    className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
                  >
                    <Text className="text-[15px] text-ivory" style={fontStyles.uiSemibold}>
                      Accept changes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Keep original"
                    className="h-12 items-center justify-center rounded-2xl border border-border-strong active:opacity-70"
                  >
                    <Text className="text-[14px] text-espresso" style={fontStyles.uiMedium}>
                      Keep original
                    </Text>
                  </Pressable>
                </>
              ) : isRethinking ? (
                <Pressable
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  className="h-12 items-center justify-center rounded-2xl border border-border-strong active:opacity-70"
                >
                  <Text className="text-[14px] text-muted" style={fontStyles.uiMedium}>
                    Cancel
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={!note.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm rethink"
                    className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
                    style={!note.trim() ? { opacity: 0.4 } : undefined}
                  >
                    <Text className="text-[15px] text-ivory" style={fontStyles.uiSemibold}>
                      Rethink this day
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    className="h-12 items-center justify-center active:opacity-70"
                  >
                    <Text className="text-[14px] text-muted" style={fontStyles.uiMedium}>
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RethinkDayPreview({
  original,
  refined,
}: {
  original: DayPlan;
  refined: DayPlan | null;
}) {
  if (!refined) {
    return (
      <Text className="text-[13px] text-muted" style={fontStyles.uiRegular}>
        No changes returned for this day.
      </Text>
    );
  }

  const addedCount = Math.max(0, refined.items.length - original.items.length);
  const removedCount = Math.max(0, original.items.length - refined.items.length);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[11px] uppercase tracking-[1.5px] text-muted"
          style={fontStyles.uiMedium}
        >
          New plan
        </Text>
        {(addedCount > 0 || removedCount > 0) && (
          <Text className="text-[11px] text-muted" style={fontStyles.uiRegular}>
            {addedCount > 0 ? `+${addedCount}` : ""}
            {removedCount > 0 ? ` −${removedCount}` : ""} stops
          </Text>
        )}
      </View>

      <View className="gap-1.5">
        {refined.items.map((item, idx) => (
          <View
            key={idx}
            className="flex-row items-baseline gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5"
          >
            <Text
              className="w-12 text-right text-[11px] text-muted"
              style={fontStyles.uiRegular}
            >
              {formatTripStopTime(item.time)}
            </Text>
            <View className="flex-1">
              <Text
                className="text-[13px] text-espresso"
                style={fontStyles.uiMedium}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.location ? (
                <Text
                  className="mt-0.5 text-[12px] text-muted"
                  style={fontStyles.uiRegular}
                  numberOfLines={1}
                >
                  {item.location}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <Text className="text-[11px] leading-4 text-muted" style={fontStyles.uiRegular}>
        Accepting replaces Day {original.day_number} in your local draft. Publish to save.
      </Text>
    </View>
  );
}

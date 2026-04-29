// Path: ui-mobile/features/trips/workspace/RegenerateSheet.tsx
// Summary: Implements RegenerateSheet module logic.

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import type { DayPlan, Itinerary, RefinementVariant } from "@/features/ai/api";
import { useRefineItineraryMutation } from "@/features/ai/hooks";
import { fontStyles } from "@/shared/theme/typography";

type RefineState =
  | { kind: "idle" }
  | { kind: "refining" }
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

const VARIANTS: { key: RefinementVariant; label: string }[] = [
  { key: "cheaper", label: "Cheaper" },
  { key: "more_local", label: "More local" },
  { key: "less_walking", label: "Less walking" },
  { key: "faster_pace", label: "Faster pace" },
];

export function RegenerateSheet({
  visible,
  tripId,
  day,
  currentItinerary,
  onAccept,
  onClose,
}: Props) {
  const [variant, setVariant] = useState<RefinementVariant | null>(null);
  const [refineState, setRefineState] = useState<RefineState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const { mutateAsync: refine } = useRefineItineraryMutation();

  function handleClose() {
    abortRef.current?.abort();
    abortRef.current = null;
    setRefineState({ kind: "idle" });
    setVariant(null);
    onClose();
  }

  function handleAccept() {
    if (refineState.kind !== "preview") return;
    onAccept(refineState.refinedItinerary);
    setRefineState({ kind: "idle" });
    setVariant(null);
  }

  async function handleRegenerate() {
    if (!day) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setRefineState({ kind: "refining" });

    try {
      const result = await refine({
        tripId,
        payload: {
          current_itinerary: currentItinerary,
          locked_items: [],
          favorite_items: [],
          regenerate_day_number: day.day_number,
          variant: variant ?? undefined,
        },
        signal: controller.signal,
      });
      setRefineState({ kind: "preview", refinedItinerary: result });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setRefineState({
        kind: "error",
        message: (err as Error).message || "We couldn't refine this day. Try again.",
      });
    }
  }

  if (!day) return null;

  const dayTitle = day.day_title?.trim() || `Day ${day.day_number}`;
  const isRefining = refineState.kind === "refining";
  const isPreview = refineState.kind === "preview";

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
          {/* Handle */}
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
                Improve this day
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

            {/* Variant chips */}
            {!isRefining && !isPreview && (
              <View>
                <Text
                  className="mb-2.5 text-[11px] uppercase tracking-[1.5px] text-muted"
                  style={fontStyles.uiMedium}
                >
                  Direction (optional)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {VARIANTS.map((v) => {
                    const active = variant === v.key;
                    return (
                      <Pressable
                        key={v.key}
                        onPress={() => setVariant(active ? null : v.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        className={[
                          "rounded-full border px-4 py-2 active:opacity-70",
                          active
                            ? "border-ontrip bg-ontrip"
                            : "border-border-strong bg-transparent",
                        ].join(" ")}
                      >
                        <Text
                          className={active ? "text-[13px] text-on-dark" : "text-[13px] text-espresso"}
                          style={fontStyles.uiMedium}
                        >
                          {v.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Refining spinner */}
            {isRefining && (
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-4">
                <ActivityIndicator size="small" color="#B86845" />
                <View className="flex-1">
                  <Text
                    className="text-[14px] text-espresso"
                    style={fontStyles.uiSemibold}
                  >
                    Working on {dayTitle}…
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
            {refineState.kind === "error" && (
              <Text className="text-[13px] text-danger" style={fontStyles.uiRegular}>
                {refineState.message}
              </Text>
            )}

            {/* Preview */}
            {isPreview && (
              <RefinedDayPreview
                original={day}
                refined={refineState.refinedItinerary.days.find(
                  (d) => d.day_number === day.day_number,
                ) ?? null}
              />
            )}

            {/* Actions */}
            <View className="gap-2.5">
              {isPreview ? (
                <>
                  <Pressable
                    onPress={handleAccept}
                    accessibilityRole="button"
                    className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
                  >
                    <Text
                      className="text-[15px] text-ivory"
                      style={fontStyles.uiSemibold}
                    >
                      Accept changes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClose}
                    accessibilityRole="button"
                    className="h-12 items-center justify-center rounded-2xl border border-border-strong active:opacity-70"
                  >
                    <Text
                      className="text-[14px] text-espresso"
                      style={fontStyles.uiMedium}
                    >
                      Keep original
                    </Text>
                  </Pressable>
                </>
              ) : isRefining ? (
                <Pressable
                  onPress={handleClose}
                  accessibilityRole="button"
                  className="h-12 items-center justify-center rounded-2xl border border-border-strong active:opacity-70"
                >
                  <Text
                    className="text-[14px] text-muted"
                    style={fontStyles.uiMedium}
                  >
                    Cancel
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleRegenerate()}
                    accessibilityRole="button"
                    className="h-14 items-center justify-center rounded-2xl bg-espresso active:opacity-80"
                  >
                    <Text
                      className="text-[15px] text-ivory"
                      style={fontStyles.uiSemibold}
                    >
                      Regenerate this day
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClose}
                    accessibilityRole="button"
                    className="h-12 items-center justify-center active:opacity-70"
                  >
                    <Text
                      className="text-[14px] text-muted"
                      style={fontStyles.uiMedium}
                    >
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

function RefinedDayPreview({
  original,
  refined,
}: {
  original: DayPlan;
  refined: DayPlan | null;
}) {
  if (!refined) {
    return (
      <Text className="text-[13px] text-muted" style={fontStyles.uiRegular}>
        Refinement returned no changes for this day.
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
              {item.time?.trim() || "TBD"}
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

      <Text
        className="text-[11px] leading-4 text-muted"
        style={fontStyles.uiRegular}
      >
        Accepting replaces Day {original.day_number} in your local draft. Publish to save.
      </Text>
    </View>
  );
}

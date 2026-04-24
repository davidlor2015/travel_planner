import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { TextInputField } from "@/shared/ui/TextInputField";

import type { TripCreate, TripResponse, TripUpdate } from "./types";
import {
  BUDGET_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  serializePreferences,
} from "./tripSchema";

export type TripFormValue = {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  notes: string;
  budget?: string;
  pace?: string;
  interests?: string[];
};

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  trip?: TripResponse | null;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: TripFormValue) => Promise<void>;
};

function toInitialValue(
  mode: "create" | "edit",
  trip?: TripResponse | null,
): TripFormValue {
  return {
    title:       trip?.title                    ?? "",
    destination: trip?.destination              ?? "",
    start_date:  trip?.start_date?.slice(0, 10) ?? "",
    end_date:    trip?.end_date?.slice(0, 10)   ?? "",
    notes:       mode === "edit" ? (trip?.notes ?? "") : "",
    budget:      undefined,
    pace:        undefined,
    interests:   [],
  };
}

function validate(
  value: TripFormValue,
): Partial<Record<keyof TripFormValue, string>> {
  const next: Partial<Record<keyof TripFormValue, string>> = {};
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!value.title.trim())       next.title       = "Trip title is required.";
  if (!value.destination.trim()) next.destination = "Destination is required.";
  if (!value.start_date)         next.start_date  = "Start date is required.";
  if (value.start_date && !datePattern.test(value.start_date))
    next.start_date = "Use YYYY-MM-DD.";
  if (!value.end_date)           next.end_date    = "End date is required.";
  if (value.end_date && !datePattern.test(value.end_date))
    next.end_date = "Use YYYY-MM-DD.";
  if (value.start_date && value.end_date && value.end_date < value.start_date)
    next.end_date = "End date must be on or after start date.";
  return next;
}

export function buildCreateTripPayload(value: TripFormValue): TripCreate {
  const preferenceNotes = serializePreferences({
    budget:    value.budget,
    pace:      value.pace,
    interests: value.interests,
  });
  return {
    title:       value.title.trim(),
    destination: value.destination.trim(),
    start_date:  value.start_date,
    end_date:    value.end_date,
    notes:       preferenceNotes || undefined,
  };
}

export function buildTripUpdatePayload(value: TripFormValue): TripUpdate {
  return {
    title:       value.title.trim(),
    destination: value.destination.trim(),
    start_date:  value.start_date,
    end_date:    value.end_date,
    notes:       value.notes.trim() || undefined,
  };
}

export function TripFormSheet({
  visible,
  mode,
  trip,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [value, setValue] = useState<TripFormValue>(toInitialValue(mode, trip));
  const [errors, setErrors] = useState<
    Partial<Record<keyof TripFormValue, string>>
  >({});

  useEffect(() => {
    if (!visible) return;
    setValue(toInitialValue(mode, trip));
    setErrors({});
  }, [trip, visible, mode]);

  const titleLabel =
    mode === "create" ? "Create Trip" : "Edit Trip";
  const subtitle =
    mode === "create"
      ? "Destination, dates, and preferences shape the AI-generated itinerary."
      : "Update trip details without leaving mobile.";

  function toggleSegment(field: "budget" | "pace", next: string) {
    setValue((c) => ({
      ...c,
      [field]: c[field] === next ? undefined : next,
    }));
  }

  function toggleInterest(interest: string) {
    setValue((prev) => {
      const current = prev.interests ?? [];
      const next = current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest];
      return { ...prev, interests: next };
    });
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="max-h-[92%] rounded-t-[28px] bg-bg-app">
            <ScreenHeader
              title={titleLabel}
              subtitle={subtitle}
              onBack={onClose}
            />

            <ScrollView contentContainerClassName="gap-4 px-4 pb-8">
              <TextInputField
                label="Trip title"
                placeholder="e.g. Summer in Rome"
                value={value.title}
                onChangeText={(v) => setValue((c) => ({ ...c, title: v }))}
                error={errors.title}
              />
              <TextInputField
                label="Destination"
                placeholder="e.g. Rome, Italy"
                value={value.destination}
                onChangeText={(v) =>
                  setValue((c) => ({ ...c, destination: v }))
                }
                error={errors.destination}
              />
              <TextInputField
                label="Start date"
                hint="YYYY-MM-DD"
                placeholder="2026-07-10"
                value={value.start_date}
                onChangeText={(v) =>
                  setValue((c) => ({ ...c, start_date: v }))
                }
                autoCapitalize="none"
                error={errors.start_date}
              />
              <TextInputField
                label="End date"
                hint="YYYY-MM-DD"
                placeholder="2026-07-16"
                value={value.end_date}
                onChangeText={(v) => setValue((c) => ({ ...c, end_date: v }))}
                autoCapitalize="none"
                error={errors.end_date}
              />

              {/* ── Preferences (create mode only) ──────────────── */}
              {mode === "create" && (
                <View className="rounded-2xl border border-border bg-surface-muted px-4 pb-4 pt-3">
                  <Text className="mb-4 text-[11px] font-semibold uppercase tracking-[0.5px] text-text-soft">
                    AI Preferences · Optional
                  </Text>

                  {/* Budget */}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-text">
                      Budget
                    </Text>
                    <View className="flex-row gap-2">
                      {BUDGET_OPTIONS.map((opt) => {
                        const active = value.budget === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => toggleSegment("budget", opt.value)}
                            className={`flex-1 items-center rounded-full border py-2 active:opacity-70 ${
                              active
                                ? "border-amber bg-amber"
                                : "border-border bg-transparent"
                            }`}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Pace */}
                  <View className="mt-4 gap-2">
                    <Text className="text-sm font-semibold text-text">
                      Pace
                    </Text>
                    <View className="flex-row gap-2">
                      {PACE_OPTIONS.map((opt) => {
                        const active = value.pace === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => toggleSegment("pace", opt.value)}
                            className={`flex-1 items-center rounded-full border py-2 active:opacity-70 ${
                              active
                                ? "border-amber bg-amber"
                                : "border-border bg-transparent"
                            }`}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Interests */}
                  <View className="mt-4 gap-2">
                    <Text className="text-sm font-semibold text-text">
                      Interests
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((interest) => {
                        const active =
                          value.interests?.includes(interest) ?? false;
                        return (
                          <Pressable
                            key={interest}
                            onPress={() => toggleInterest(interest)}
                            className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                              active
                                ? "border-amber bg-amber"
                                : "border-border bg-transparent"
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium capitalize ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                            >
                              {interest}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* Edit mode: free-text notes */}
              {mode === "edit" && (
                <TextInputField
                  label="Trip notes"
                  hint="Optional"
                  placeholder="Pace, budget, interests, reminders"
                  value={value.notes}
                  onChangeText={(v) => setValue((c) => ({ ...c, notes: v }))}
                  multiline
                />
              )}

              {error ? (
                <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                  <Text className="text-sm font-medium text-danger">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="gap-2 pt-2">
                <PrimaryButton
                  label={
                    submitting
                      ? mode === "create"
                        ? "Creating…"
                        : "Saving…"
                      : titleLabel
                  }
                  onPress={() => {
                    const nextErrors = validate(value);
                    setErrors(nextErrors);
                    if (Object.keys(nextErrors).length > 0) return;
                    void onSubmit(value);
                  }}
                  disabled={submitting}
                  fullWidth
                />
                <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

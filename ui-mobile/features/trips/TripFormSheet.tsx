import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";

import { Button, PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { TextInputField } from "@/shared/ui/TextInputField";

import type { TripCreate, TripResponse, TripUpdate } from "./types";

export type TripFormValue = {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  notes: string;
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

function toInitialValue(trip?: TripResponse | null): TripFormValue {
  return {
    title: trip?.title ?? "",
    destination: trip?.destination ?? "",
    start_date: trip?.start_date?.slice(0, 10) ?? "",
    end_date: trip?.end_date?.slice(0, 10) ?? "",
    notes: trip?.notes ?? "",
  };
}

function validate(value: TripFormValue): Partial<Record<keyof TripFormValue, string>> {
  const next: Partial<Record<keyof TripFormValue, string>> = {};
  if (!value.title.trim()) next.title = "Trip title is required.";
  if (!value.destination.trim()) next.destination = "Destination is required.";
  if (!value.start_date) next.start_date = "Start date is required.";
  if (!value.end_date) next.end_date = "End date is required.";
  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    next.end_date = "End date must be on or after start date.";
  }
  return next;
}

export function buildCreateTripPayload(value: TripFormValue): TripCreate {
  return {
    title: value.title.trim(),
    destination: value.destination.trim(),
    start_date: value.start_date,
    end_date: value.end_date,
    notes: value.notes.trim() || undefined,
  };
}

export function buildTripUpdatePayload(value: TripFormValue): TripUpdate {
  return {
    title: value.title.trim(),
    destination: value.destination.trim(),
    start_date: value.start_date,
    end_date: value.end_date,
    notes: value.notes.trim() || undefined,
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
  const [value, setValue] = useState<TripFormValue>(toInitialValue(trip));
  const [errors, setErrors] = useState<Partial<Record<keyof TripFormValue, string>>>({});

  useEffect(() => {
    if (!visible) return;
    setValue(toInitialValue(trip));
    setErrors({});
  }, [trip, visible]);

  const title = mode === "create" ? "Create Trip" : "Edit Trip";
  const subtitle =
    mode === "create"
      ? "Start with destination and dates. You can fill in the rest from the workspace."
      : "Update trip details without leaving mobile.";

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="max-h-[92%] rounded-t-[28px] bg-bg-app">
            <ScreenHeader title={title} subtitle={subtitle} onBack={onClose} />

            <ScrollView contentContainerClassName="gap-4 px-4 pb-8">
              <TextInputField
                label="Trip title"
                placeholder="e.g. Summer in Rome"
                value={value.title}
                onChangeText={(titleText) => setValue((current) => ({ ...current, title: titleText }))}
                error={errors.title}
              />
              <TextInputField
                label="Destination"
                placeholder="e.g. Rome, Italy"
                value={value.destination}
                onChangeText={(destination) =>
                  setValue((current) => ({ ...current, destination }))
                }
                error={errors.destination}
              />
              <TextInputField
                label="Start date"
                hint="YYYY-MM-DD"
                placeholder="2026-07-10"
                value={value.start_date}
                onChangeText={(start_date) => setValue((current) => ({ ...current, start_date }))}
                autoCapitalize="none"
                error={errors.start_date}
              />
              <TextInputField
                label="End date"
                hint="YYYY-MM-DD"
                placeholder="2026-07-16"
                value={value.end_date}
                onChangeText={(end_date) => setValue((current) => ({ ...current, end_date }))}
                autoCapitalize="none"
                error={errors.end_date}
              />
              <TextInputField
                label="Trip notes"
                hint="Optional"
                placeholder="Pace, budget, interests, or reminders"
                value={value.notes}
                onChangeText={(notes) => setValue((current) => ({ ...current, notes }))}
                multiline
              />
              {error ? (
                <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                  <Text className="text-sm font-medium text-danger">{error}</Text>
                </View>
              ) : null}

              <View className="gap-2 pt-2">
                <PrimaryButton
                  label={submitting ? (mode === "create" ? "Creating…" : "Saving…") : title}
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

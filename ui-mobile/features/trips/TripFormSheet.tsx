// Path: ui-mobile/features/trips/TripFormSheet.tsx
// Summary: Implements TripFormSheet module logic.

import { useEffect, useState, type ReactNode } from "react";
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
import { fontStyles } from "@/shared/theme/typography";

import { PlaceAutocompleteInput } from "./PlaceAutocompleteInput";
import type { PlaceSuggestion, TripCreate, TripResponse, TripUpdate } from "./types";
import { usePlaceAutocomplete } from "./usePlaceAutocomplete";
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
  selectedDestinationPlace?: PlaceSuggestion | null;
};

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  trip?: TripResponse | null;
  submitting?: boolean;
  deleting?: boolean;
  error?: string | null;
  canDeleteTrip?: boolean;
  onClose: () => void;
  onSubmit: (value: TripFormValue) => Promise<void>;
  onDeleteTrip?: () => void;
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
    selectedDestinationPlace: null,
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
  deleting = false,
  error,
  canDeleteTrip = false,
  onClose,
  onSubmit,
  onDeleteTrip,
}: Props) {
  const {
    query: destinationQuery,
    suggestions: placeSuggestions,
    selectedPlace,
    isLoading: isSearchingPlaces,
    error: placeSearchError,
    hasSearched: hasSearchedPlaces,
    minQueryLength,
    onQueryChange: onDestinationQueryChange,
    selectSuggestion: onDestinationSuggestionSelect,
    reset: resetDestinationAutocomplete,
  } = usePlaceAutocomplete({
    debounceMs: 300,
    minQueryLength: 2,
  });
  const [value, setValue] = useState<TripFormValue>(toInitialValue(mode, trip));
  const [errors, setErrors] = useState<
    Partial<Record<keyof TripFormValue, string>>
  >({});

  useEffect(() => {
    if (!visible) return;
    const initial = toInitialValue(mode, trip);
    setValue(initial);
    resetDestinationAutocomplete(initial.destination);
    setErrors({});
  }, [trip, visible, mode, resetDestinationAutocomplete]);

  useEffect(() => {
    setValue((current) => {
      if (current.destination === destinationQuery) return current;
      return { ...current, destination: destinationQuery };
    });
  }, [destinationQuery]);

  useEffect(() => {
    setValue((current) => {
      if (current.selectedDestinationPlace === selectedPlace) return current;
      return { ...current, selectedDestinationPlace: selectedPlace };
    });
  }, [selectedPlace]);

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

  function handleSubmit() {
    const submitValue: TripFormValue = {
      ...value,
      destination: destinationQuery,
      selectedDestinationPlace: selectedPlace,
    };
    const nextErrors = validate(submitValue);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(submitValue);
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
          <View className="max-h-[92%] overflow-hidden rounded-t-[30px] border border-border bg-bg-app">
            <View className="items-center pt-3">
              <View className="h-1.5 w-12 rounded-full bg-border-strong" />
            </View>
            <View className="border-b border-border/70 bg-bg-app">
              <ScreenHeader
                title={titleLabel}
                subtitle={subtitle}
                onBack={onClose}
              />
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4">
              <FormSection
                eyebrow="Core details"
                description="Destination and dates anchor the workspace."
              >
                <TextInputField
                  label="Trip title"
                  placeholder="e.g. Summer in Rome"
                  value={value.title}
                  onChangeText={(v) => setValue((c) => ({ ...c, title: v }))}
                  error={errors.title}
                />
                <PlaceAutocompleteInput
                  label="Destination"
                  placeholder="e.g. Rome, Italy"
                  value={destinationQuery}
                  minQueryLength={minQueryLength}
                  loading={isSearchingPlaces}
                  searchError={placeSearchError}
                  hasSearched={hasSearchedPlaces}
                  suggestions={placeSuggestions}
                  onChangeText={onDestinationQueryChange}
                  onSelectSuggestion={onDestinationSuggestionSelect}
                  error={errors.destination}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
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
                  </View>
                  <View className="flex-1">
                    <TextInputField
                      label="End date"
                      hint="YYYY-MM-DD"
                      placeholder="2026-07-16"
                      value={value.end_date}
                      onChangeText={(v) => setValue((c) => ({ ...c, end_date: v }))}
                      autoCapitalize="none"
                      error={errors.end_date}
                    />
                  </View>
                </View>
              </FormSection>

              {/* ── Preferences (create mode only) ──────────────── */}
              {mode === "create" && (
                <FormSection
                  eyebrow="Optional guidance"
                  description="Preferences help shape the first itinerary draft."
                >
                  {/* Budget */}
                  <View className="gap-2">
                    <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
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
                                ? "border-text bg-text"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                              style={fontStyles.uiSemibold}
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
                    <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
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
                                ? "border-text bg-text"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                              style={fontStyles.uiSemibold}
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
                    <Text className="text-sm text-text" style={fontStyles.uiSemibold}>
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
                                ? "border-text bg-text"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-xs capitalize ${
                                active ? "text-ivory" : "text-text-muted"
                              }`}
                              style={fontStyles.uiMedium}
                            >
                              {interest}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </FormSection>
              )}

              {/* Edit mode: free-text notes */}
              {mode === "edit" && (
                <FormSection
                  eyebrow="Trip preferences"
                  description="Notes guide itinerary generation and planning."
                >
                  <TextInputField
                    label="Trip notes"
                    hint="Optional"
                    placeholder="Pace, budget, interests, reminders"
                    value={value.notes}
                    onChangeText={(v) => setValue((c) => ({ ...c, notes: v }))}
                    multiline
                  />
                </FormSection>
              )}

              {mode === "edit" && canDeleteTrip && onDeleteTrip ? (
                <FormSection
                  eyebrow="Trip settings"
                  description="Remove this trip from Waypoint when you no longer need it saved."
                >
                  <Pressable
                    onPress={onDeleteTrip}
                    disabled={submitting || deleting}
                    accessibilityRole="button"
                    accessibilityLabel="Delete trip"
                    className={[
                      "min-h-11 flex-row items-center justify-between rounded-2xl border border-danger/20 bg-white px-4 py-3 active:opacity-70",
                      submitting || deleting ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <Text className="text-sm text-danger" style={fontStyles.uiSemibold}>
                      {deleting ? "Deleting…" : "Delete trip"}
                    </Text>
                    <Text className="text-lg leading-5 text-danger" style={fontStyles.uiSemibold}>
                      ›
                    </Text>
                  </Pressable>
                </FormSection>
              ) : null}

              {error ? (
                <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                  <Text className="text-sm text-danger" style={fontStyles.uiMedium}>
                    {error}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="gap-2 border-t border-border bg-bg-app px-4 pb-6 pt-3">
              <PrimaryButton
                label={
                  submitting
                    ? mode === "create"
                      ? "Creating…"
                      : "Saving…"
                    : titleLabel
                }
                onPress={handleSubmit}
                disabled={submitting}
                fullWidth
              />
              <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function FormSection({
  eyebrow,
  description,
  children,
}: {
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-surface-muted px-4 py-4">
      <View>
        <Text
          className="text-[10px] uppercase tracking-[1.2px] text-text-soft"
          style={fontStyles.monoMedium}
        >
          {eyebrow}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-text-muted" style={fontStyles.uiRegular}>
          {description}
        </Text>
      </View>
      <View className="gap-4">{children}</View>
    </View>
  );
}

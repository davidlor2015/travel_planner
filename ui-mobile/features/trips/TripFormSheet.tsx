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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, SecondaryButton } from "@/shared/ui/Button";
import { Field } from "@/shared/ui/Field";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { TextInputField } from "@/shared/ui/TextInputField";
import { fontStyles } from "@/shared/theme/typography";

import { DateRangePickerSheet } from "./DateRangePickerSheet";
import { DestinationPickerSheet } from "./DestinationPickerSheet";
import type {
  PlaceSuggestion,
  SelectedDestination,
  TripCreate,
  TripResponse,
  TripUpdate,
} from "./types";
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
  selectedDestination?: SelectedDestination | null;
  selectedDestinationPlace?: PlaceSuggestion | null;
};

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  trip?: TripResponse | null;
  initialDestination?: string;
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
  initialDestination?: string,
): TripFormValue {
  const initialDestinationText = trip?.destination ?? initialDestination ?? "";
  return {
    title:       trip?.title                    ?? "",
    destination: initialDestinationText,
    start_date:  trip?.start_date?.slice(0, 10) ?? "",
    end_date:    trip?.end_date?.slice(0, 10)   ?? "",
    notes:       mode === "edit" ? (trip?.notes ?? "") : "",
    budget:      undefined,
    pace:        undefined,
    interests:   [],
    selectedDestination: initialDestinationText
      ? destinationFromText(
          initialDestinationText,
          trip ? "saved_trip" : "initial_destination",
        )
      : null,
    selectedDestinationPlace: null,
  };
}

function validate(
  value: TripFormValue,
): Partial<Record<keyof TripFormValue, string>> {
  const next: Partial<Record<keyof TripFormValue, string>> = {};
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!value.title.trim())       next.title       = "Trip title is required.";
  if (!value.selectedDestination)
    next.destination =
      "Choose a destination from the search results so Roen knows where to build your trip.";
  if (!value.start_date || !value.end_date) {
    next.start_date = "Choose your trip dates before continuing.";
    return next;
  }
  if (value.start_date && !datePattern.test(value.start_date))
    next.start_date = "Use YYYY-MM-DD.";
  if (value.end_date && !datePattern.test(value.end_date))
    next.end_date = "Use YYYY-MM-DD.";
  if (value.start_date && value.end_date && value.end_date < value.start_date)
    next.end_date = "End date must be on or after start date.";
  return next;
}

export function buildCreateTripPayload(value: TripFormValue): TripCreate {
  const destination =
    value.selectedDestination?.displayName.trim() || value.destination.trim();
  const preferenceNotes = serializePreferences({
    budget:    value.budget,
    pace:      value.pace,
    interests: value.interests,
  });
  return {
    title:       value.title.trim(),
    destination,
    start_date:  value.start_date,
    end_date:    value.end_date,
    notes:       preferenceNotes || undefined,
  };
}

export function buildTripUpdatePayload(value: TripFormValue): TripUpdate {
  const destination =
    value.selectedDestination?.displayName.trim() || value.destination.trim();
  return {
    title:       value.title.trim(),
    destination,
    start_date:  value.start_date,
    end_date:    value.end_date,
    notes:       value.notes.trim() || undefined,
  };
}

function destinationFromText(
  displayName: string,
  source: string,
): SelectedDestination {
  const name =
    displayName.split(",").map((part) => part.trim()).find(Boolean) || displayName;
  return {
    id: `${source}:${displayName.trim().toLowerCase()}`,
    name,
    displayName,
    source,
  };
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatAutoTitleDateRange(startDate: string, endDate: string): string | null {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) return null;

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

function buildSuggestedTitle(value: TripFormValue): string | null {
  const destination = value.selectedDestination;
  if (!destination || !value.start_date || !value.end_date) return null;
  const dateRange = formatAutoTitleDateRange(value.start_date, value.end_date);
  if (!dateRange) return null;
  return `${destination.name} · ${dateRange}`;
}

function formatDisplayDate(value: string): string {
  const date = parseDateInput(value);
  if (!date) return "Choose date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TripFormSheet({
  visible,
  mode,
  trip,
  initialDestination,
  submitting = false,
  deleting = false,
  error,
  canDeleteTrip = false,
  onClose,
  onSubmit,
  onDeleteTrip,
}: Props) {
  const insets = useSafeAreaInsets();
  const {
    query: destinationQuery,
    suggestions: placeSuggestions,
    isLoading: isSearchingPlaces,
    error: placeSearchError,
    hasSearched: hasSearchedPlaces,
    minQueryLength,
    onQueryChange: onDestinationQueryChange,
    reset: resetDestinationAutocomplete,
  } = usePlaceAutocomplete({
    debounceMs: 300,
    minQueryLength: 2,
  });
  const [value, setValue] = useState<TripFormValue>(toInitialValue(mode, trip));
  const [destinationSheetOpen, setDestinationSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [dateSelectionMode, setDateSelectionMode] = useState<"start" | "end">("start");
  const [errors, setErrors] = useState<
    Partial<Record<keyof TripFormValue, string>>
  >({});

  useEffect(() => {
    if (!visible) return;
    const initial = toInitialValue(mode, trip, initialDestination);
    setValue(initial);
    resetDestinationAutocomplete(initial.destination);
    setDateSheetOpen(false);
    setDateSelectionMode("start");
    setErrors({});
  }, [trip, visible, mode, initialDestination, resetDestinationAutocomplete]);

  const titleLabel = mode === "create" ? "Create trip" : "Edit trip";
  const submitLabel = mode === "create" ? "Create trip" : "Save changes";
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
    const suggestedTitle = value.title.trim() ? null : buildSuggestedTitle(value);
    const submitValue: TripFormValue = suggestedTitle
      ? { ...value, title: suggestedTitle }
      : value;
    const nextErrors = validate(submitValue);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void onSubmit(submitValue);
  }

  function handleSelectDestination(destination: SelectedDestination) {
    setValue((current) => ({
      ...current,
      destination: destination.displayName,
      selectedDestination: destination,
      selectedDestinationPlace: null,
    }));
    resetDestinationAutocomplete(destination.displayName);
    setErrors((current) => ({ ...current, destination: undefined }));
    setDestinationSheetOpen(false);
  }

  function handleOpenDateSheet(selectionMode: "start" | "end") {
    setDateSelectionMode(selectionMode);
    setDateSheetOpen(true);
  }

  function handleConfirmDates(range: { startDate: string; endDate: string }) {
    setValue((current) => ({
      ...current,
      start_date: range.startDate,
      end_date: range.endDate,
    }));
    setErrors((current) => ({
      ...current,
      start_date: undefined,
      end_date: undefined,
    }));
    setDateSheetOpen(false);
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-bg-app">
        <KeyboardAvoidingView
          className="flex-1 bg-bg-app"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View className="flex-1 bg-bg-app">
            <View
              className="border-b border-border/70 bg-bg-app pb-3"
              style={{ paddingTop: Math.max(insets.top, 12) }}
            >
              <ScreenHeader
                title={titleLabel}
                subtitle={subtitle}
                onBack={onClose}
              />
            </View>

            <ScrollView
              className="flex-1 bg-bg-app"
              contentContainerStyle={{
                gap: 16,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 28,
              }}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              showsVerticalScrollIndicator={false}
            >
              <FormSection
                eyebrow="Core details"
                description="Destination and dates anchor your trip plan."
              >
                <TextInputField
                  label="Trip title"
                  placeholder="e.g. Summer in Rome"
                  value={value.title}
                  onChangeText={(v) => setValue((c) => ({ ...c, title: v }))}
                  error={errors.title}
                />
                <DestinationPickerRow
                  selectedDestination={value.selectedDestination ?? null}
                  error={errors.destination}
                  onPress={() => setDestinationSheetOpen(true)}
                />
                <View className="gap-1.5">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <DateField
                        label="Start date"
                        value={value.start_date}
                        error={Boolean(errors.start_date || errors.end_date)}
                        onPress={() => handleOpenDateSheet("start")}
                      />
                    </View>
                    <View className="flex-1">
                      <DateField
                        label="End date"
                        value={value.end_date}
                        error={Boolean(errors.start_date || errors.end_date)}
                        onPress={() => handleOpenDateSheet("end")}
                      />
                    </View>
                  </View>
                  {errors.start_date || errors.end_date ? (
                    <Text
                      className="text-xs text-danger"
                      style={fontStyles.uiMedium}
                      accessibilityRole="alert"
                    >
                      {errors.start_date ?? errors.end_date}
                    </Text>
                  ) : null}
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
                                ? "border-ontrip bg-ontrip"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                active ? "text-on-dark" : "text-text-muted"
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
                                ? "border-ontrip bg-ontrip"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                active ? "text-on-dark" : "text-text-muted"
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
                                ? "border-ontrip bg-ontrip"
                                : "border-border bg-white"
                            }`}
                          >
                            <Text
                              className={`text-xs capitalize ${
                                active ? "text-on-dark" : "text-text-muted"
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
                  description="Remove this trip from Roen when you no longer need it saved."
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

            <View
              className="gap-2 border-t border-border bg-bg-app px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <Button
                label={
                  submitting
                    ? mode === "create"
                      ? "Creating…"
                      : "Saving…"
                    : submitLabel
                }
                onPress={handleSubmit}
                disabled={submitting || deleting}
                fullWidth
                variant="ontrip"
              />
              <SecondaryButton
                label="Cancel"
                onPress={onClose}
                disabled={submitting || deleting}
                fullWidth
              />
            </View>
          </View>
        </KeyboardAvoidingView>
        <DestinationPickerSheet
          visible={destinationSheetOpen}
          query={destinationQuery}
          suggestions={placeSuggestions}
          loading={isSearchingPlaces}
          searchError={placeSearchError}
          hasSearched={hasSearchedPlaces}
          minQueryLength={minQueryLength}
          onChangeQuery={onDestinationQueryChange}
          onSelectDestination={handleSelectDestination}
          onClose={() => setDestinationSheetOpen(false)}
        />
        <DateRangePickerSheet
          visible={dateSheetOpen}
          startDate={value.start_date}
          endDate={value.end_date}
          initialSelectionMode={dateSelectionMode}
          onConfirm={handleConfirmDates}
          onClose={() => setDateSheetOpen(false)}
        />
      </View>
    </Modal>
  );
}

function DateField({
  label,
  value,
  error,
  onPress,
}: {
  label: "Start date" | "End date";
  value: string;
  error: boolean;
  onPress: () => void;
}) {
  const displayValue = formatDisplayDate(value);

  return (
    <Field label={label}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${displayValue}`}
        className={[
          "min-h-14 justify-center rounded-2xl border bg-white px-4 py-3 active:opacity-70",
          error ? "border-danger" : "border-border",
        ].join(" ")}
      >
        <Text
          className={value ? "text-[15px] text-text" : "text-[15px] text-text-muted"}
          style={fontStyles.uiMedium}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
      </Pressable>
    </Field>
  );
}

function DestinationPickerRow({
  selectedDestination,
  error,
  onPress,
}: {
  selectedDestination: SelectedDestination | null;
  error?: string | null;
  onPress: () => void;
}) {
  return (
    <Field label="Destination" error={error}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          selectedDestination
            ? `Destination, ${selectedDestination.displayName}. Change destination.`
            : "Choose destination"
        }
        className={[
          "min-h-14 flex-row items-center rounded-2xl border bg-white px-4 py-3 active:opacity-70",
          error ? "border-danger" : "border-border",
        ].join(" ")}
      >
        {selectedDestination ? (
          <>
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface-muted">
              <Ionicons name="location-outline" size={17} color="#B86845" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                {selectedDestination.displayName}
              </Text>
            </View>
            <Text className="ml-3 text-xs text-accent" style={fontStyles.uiSemibold}>
              Change
            </Text>
          </>
        ) : (
          <Text className="text-[15px] text-text-muted" style={fontStyles.uiMedium}>
            + Choose destination
          </Text>
        )}
      </Pressable>
    </Field>
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

// Path: ui-mobile/features/trips/workspace/StopFormSheet.tsx
// Summary: Implements StopFormSheet module logic.

import { useEffect, useMemo, useState } from "react";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ItineraryItem } from "@/features/ai/api";
import { PlaceAutocompleteInput } from "@/features/trips/PlaceAutocompleteInput";
import { usePlaceAutocomplete } from "@/features/trips/usePlaceAutocomplete";
import { Button, SecondaryButton } from "@/shared/ui/Button";
import { Field } from "@/shared/ui/Field";
import { TextInputField } from "@/shared/ui/TextInputField";
import { fontStyles } from "@/shared/theme/typography";

import type { DayOption, TimeOption } from "./itineraryDraftMutations";

export type StopFormValue = Pick<
  ItineraryItem,
  "time" | "title" | "location" | "notes"
> & {
  dayIndex: number;
};

type MoveAvailability = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveToPreviousDay: boolean;
  canMoveToNextDay: boolean;
};

type Props = {
  visible: boolean;
  item: ItineraryItem | null;
  initialDayIndex: number;
  dayOptions: DayOption[];
  timeOptions: TimeOption[];
  moveAvailability: MoveAvailability;
  onSave: (value: StopFormValue) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToPreviousDay: () => void;
  onMoveToNextDay: () => void;
  onClose: () => void;
};

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimeValue(value: string | null | undefined): Date {
  const fallback = new Date(2000, 0, 1, 9, 0, 0, 0);
  if (!value) return fallback;

  const trimmed = value.trim();
  const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      const period = twelveHour[3].toUpperCase();
      const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
      return new Date(2000, 0, 1, hour24, minute, 0, 0);
    }
  }

  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return new Date(2000, 0, 1, hour, minute, 0, 0);
    }
  }

  return fallback;
}

function formatTimeValue(value: Date): string {
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function StopFormSheet({
  visible,
  item,
  initialDayIndex,
  dayOptions,
  timeOptions,
  moveAvailability,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDayIndex);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const {
    query: locationQuery,
    suggestions: locationSuggestions,
    isLoading: isSearchingLocation,
    error: locationSearchError,
    hasSearched: hasSearchedLocation,
    minQueryLength: locationMinQueryLength,
    onQueryChange: onLocationQueryChange,
    selectSuggestion: onLocationSuggestionSelect,
    reset: resetLocationAutocomplete,
  } = usePlaceAutocomplete({ debounceMs: 300, minQueryLength: 2 });

  const effectiveTimeOptions = useMemo(() => {
    const current = item?.time?.trim() || null;
    if (!current || timeOptions.some((option) => option.value === current)) {
      return timeOptions;
    }

    return [{ label: `Current · ${current}`, value: current }, ...timeOptions];
  }, [item?.time, timeOptions]);

  useEffect(() => {
    if (!visible) return;
    setSelectedDayIndex(initialDayIndex);
    setSelectedTime(item?.time?.trim() || null);
    setTitle(item?.title ?? "");
    resetLocationAutocomplete(item?.location ?? "");
    setNotes(item?.notes ?? "");
    setTitleError(null);
    setDayPickerOpen(false);
    setTimePickerOpen(false);
  }, [initialDayIndex, item, visible, resetLocationAutocomplete]);

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Add a stop title.");
      return;
    }

    const dayExists = dayOptions.some((option) => option.value === selectedDayIndex);
    if (!dayExists) return;

    onSave({
      dayIndex: selectedDayIndex,
      time: selectedTime,
      title: trimmedTitle,
      location: nullableText(locationQuery),
      notes: nullableText(notes),
    });
  }

  function handleDelete() {
    Alert.alert("Delete stop?", "This removes the stop from this itinerary.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  function openTimePicker() {
    Keyboard.dismiss();
    setDayPickerOpen(false);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseTimeValue(selectedTime),
        mode: "time",
        display: "clock",
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) {
            setSelectedTime(formatTimeValue(selected));
          }
        },
      });
      return;
    }

    setTimePickerOpen(true);
  }

  const isEditMode = Boolean(item);
  const selectedDayLabel =
    dayOptions.find((option) => option.value === selectedDayIndex)?.label ??
    "Choose a day";
  const selectedTimeLabel =
    effectiveTimeOptions.find((option) => option.value === selectedTime)?.label ??
    selectedTime ??
    "No time";
  const footerBottomPadding = Math.max(insets.bottom, 16);
  const contentBottomPadding = footerBottomPadding + (isEditMode ? 144 : 112);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/30"
      >
        <View className="max-h-[90%] rounded-t-[28px] bg-bg pt-4">
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: contentBottomPadding,
            }}
          >
            <View className="mb-4">
              <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
                {isEditMode ? "Edit stop" : "Add stop"}
              </Text>
              <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
                Changes stay local until you publish the itinerary.
              </Text>
            </View>

            <View className="gap-4">
              <TextInputField
                label="Title"
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (titleError) setTitleError(null);
                }}
                placeholder="Stop title"
                error={titleError}
              />
              <PlaceAutocompleteInput
                label="Location"
                hint="Optional"
                placeholder="Search or type a location"
                value={locationQuery}
                minQueryLength={locationMinQueryLength}
                loading={isSearchingLocation}
                searchError={locationSearchError}
                hasSearched={hasSearchedLocation}
                suggestions={locationSuggestions}
                onChangeText={onLocationQueryChange}
                onSelectSuggestion={onLocationSuggestionSelect}
              />

              <Field label="Day">
                <View className="gap-2">
                  <SelectorButton
                    label={selectedDayLabel}
                    expanded={dayPickerOpen}
                    accessibilityLabel="Choose itinerary day"
                    onPress={() => setDayPickerOpen((current) => !current)}
                  />
                  {dayPickerOpen ? (
                    <View className="overflow-hidden rounded-2xl border border-border bg-white">
                      {dayOptions.map((option, index) => (
                        <OptionRow
                          key={option.value}
                          label={option.label}
                          selected={selectedDayIndex === option.value}
                          showDivider={index < dayOptions.length - 1}
                          onPress={() => {
                            setSelectedDayIndex(option.value);
                            setDayPickerOpen(false);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              </Field>

              <Field label="Time" hint="Trip local time">
                <Text
                  className="mb-2 text-xs leading-4 text-text-muted"
                  style={fontStyles.uiRegular}
                >
                  Times are shown in the trip&apos;s local time.
                </Text>
                <View className="gap-2">
                  <SelectorButton
                    label={selectedTimeLabel}
                    expanded={timePickerOpen}
                    accessibilityLabel="Choose stop time"
                    onPress={openTimePicker}
                  />
                </View>
              </Field>

              <TextInputField
                label="Notes"
                hint="Optional"
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes"
                multiline
                textAlignVertical="top"
                className="min-h-24"
              />

              {isEditMode ? (
                <Field label="Move stop">
                  <View className="flex-row flex-wrap gap-2">
                    <MoveButton
                      label="Move up"
                      disabled={!moveAvailability.canMoveUp}
                      onPress={onMoveUp}
                    />
                    <MoveButton
                      label="Move down"
                      disabled={!moveAvailability.canMoveDown}
                      onPress={onMoveDown}
                    />
                    <MoveButton
                      label="Previous day"
                      disabled={!moveAvailability.canMoveToPreviousDay}
                      onPress={onMoveToPreviousDay}
                    />
                    <MoveButton
                      label="Next day"
                      disabled={!moveAvailability.canMoveToNextDay}
                      onPress={onMoveToNextDay}
                    />
                  </View>
                </Field>
              ) : null}

              {isEditMode ? (
                <Field label="Stop settings">
                  <Pressable
                    onPress={handleDelete}
                    accessibilityRole="button"
                    accessibilityLabel="Delete stop"
                    className="min-h-11 flex-row items-center justify-between rounded-2xl border border-danger/20 bg-white px-4 py-3 active:opacity-70"
                  >
                    <Text className="text-sm text-danger" style={fontStyles.uiSemibold}>
                      Delete stop
                    </Text>
                    <Text className="text-lg leading-5 text-danger" style={fontStyles.uiSemibold}>
                      {">"}
                    </Text>
                  </Pressable>
                </Field>
              ) : null}

            </View>
          </ScrollView>

          <View
            className="gap-3 border-t border-border bg-bg px-4 pt-3"
            style={{ paddingBottom: footerBottomPadding }}
          >
            <Button label="Save stop" onPress={handleSave} variant="ontrip" fullWidth />
            <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
          </View>
          {Platform.OS === "ios" ? (
            <StopTimePickerSheet
              visible={timePickerOpen}
              value={selectedTime}
              onConfirm={(value) => {
                setSelectedTime(value);
                setTimePickerOpen(false);
              }}
              onClear={() => {
                setSelectedTime(null);
                setTimePickerOpen(false);
              }}
              onClose={() => setTimePickerOpen(false)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StopTimePickerSheet({
  visible,
  value,
  onConfirm,
  onClear,
  onClose,
}: {
  visible: boolean;
  value: string | null;
  onConfirm: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Date>(() => parseTimeValue(value));

  useEffect(() => {
    if (!visible) return;
    setDraft(parseTimeValue(value));
  }, [value, visible]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-10 justify-end">
      <Pressable
        className="absolute inset-0 bg-black/20"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss time picker"
      />
      <View className="rounded-t-[28px] border-t border-border bg-bg px-4 pb-4 pt-4">
        <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
        <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
          Time
        </Text>
        <Text className="mt-1 text-sm text-text-muted" style={fontStyles.uiRegular}>
          Choose the stop time in the trip&apos;s local time.
        </Text>

        <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
          <DateTimePicker
            testID="stop-time-picker"
            accessibilityLabel="Stop time picker"
            value={draft}
            mode="time"
            display="spinner"
            onChange={(event: DateTimePickerEvent, selected?: Date) => {
              if (event.type !== "dismissed" && selected) setDraft(selected);
            }}
            textColor="#1C1108"
            accentColor="#B86845"
            style={{ alignSelf: "stretch", height: 216 }}
          />
        </View>

        <View className="mt-4 gap-3">
          <Button
            label="Confirm time"
            onPress={() => onConfirm(formatTimeValue(draft))}
            variant="ontrip"
            fullWidth
          />
          <SecondaryButton label="No time" onPress={onClear} fullWidth />
          <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
        </View>
      </View>
    </View>
  );
}

function SelectorButton({
  label,
  expanded,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  expanded: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded }}
      className="min-h-12 flex-row items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 active:opacity-70"
    >
      <Text
        className="flex-1 pr-3 text-sm text-text"
        style={fontStyles.uiSemibold}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text className="text-lg leading-5 text-text-muted" style={fontStyles.uiRegular}>
        {expanded ? "^" : "v"}
      </Text>
    </Pressable>
  );
}

function OptionRow({
  label,
  selected,
  showDivider = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  showDivider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        "min-h-11 justify-center px-4 py-3 active:opacity-70",
        showDivider ? "border-b border-border" : "",
        selected ? "bg-surface-muted" : "bg-white",
      ].join(" ")}
    >
      <Text
        className={selected ? "text-sm text-espresso" : "text-sm text-text"}
        style={selected ? fontStyles.uiSemibold : fontStyles.uiMedium}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MoveButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={[
        "min-h-10 flex-1 basis-[46%] items-center justify-center rounded-full border border-border-strong px-3 py-2 active:opacity-70",
        disabled ? "bg-surface-muted opacity-40" : "bg-white",
      ].join(" ")}
    >
      <Text className="text-xs text-text-muted" style={fontStyles.uiSemibold}>
        {label}
      </Text>
    </Pressable>
  );
}

// Path: ui-mobile/features/trips/workspace/StopFormSheet.tsx
// Summary: Implements StopFormSheet module logic.

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { ItineraryItem } from "@/features/ai/api";
import { PrimaryButton, SecondaryButton } from "@/shared/ui/Button";
import { Field } from "@/shared/ui/Field";
import { MultilineInputField } from "@/shared/ui/MultilineInputField";
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
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDayIndex);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

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
    setLocation(item?.location ?? "");
    setNotes(item?.notes ?? "");
    setTitleError(null);
    setDayPickerOpen(false);
    setTimePickerOpen(false);
  }, [initialDayIndex, item, visible]);

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
      location: nullableText(location),
      notes: nullableText(notes),
    });
  }

  function handleDelete() {
    Alert.alert("Delete stop?", "This removes the stop from this itinerary.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  const isEditMode = Boolean(item);
  const selectedDayLabel =
    dayOptions.find((option) => option.value === selectedDayIndex)?.label ??
    "Choose a day";
  const selectedTimeLabel =
    effectiveTimeOptions.find((option) => option.value === selectedTime)?.label ??
    "No time";
  const timeOptionsMaxHeight = Math.min(
    176,
    Math.max(132, Math.round(windowHeight * 0.24)),
  );

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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
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
              <TextInputField
                label="Location"
                hint="Optional"
                value={location}
                onChangeText={setLocation}
                placeholder="Location"
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
                    onPress={() => setTimePickerOpen((current) => !current)}
                  />
                  {timePickerOpen ? (
                    <View className="overflow-hidden rounded-2xl border border-border bg-white">
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: timeOptionsMaxHeight }}
                      >
                        {effectiveTimeOptions.map((option, index) => (
                          <OptionRow
                            key={`${option.label}-${option.value ?? "none"}`}
                            label={option.label}
                            selected={selectedTime === option.value}
                            showDivider={index < effectiveTimeOptions.length - 1}
                            onPress={() => {
                              setSelectedTime(option.value);
                              setTimePickerOpen(false);
                            }}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              </Field>

              <MultilineInputField
                label="Notes"
                hint="Optional"
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes"
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

            </View>
          </ScrollView>

          <View className="gap-3 border-t border-border bg-bg px-4 pb-6 pt-3">
            {isEditMode ? (
              <Pressable
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete stop"
                className="min-h-10 items-center justify-center rounded-full px-4 py-2 active:opacity-70"
              >
                <Text className="text-sm text-danger" style={fontStyles.uiSemibold}>
                  Delete stop
                </Text>
              </Pressable>
            ) : null}
            <PrimaryButton label="Save stop" onPress={handleSave} fullWidth />
            <SecondaryButton label="Cancel" onPress={onClose} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
        {expanded ? "−" : "+"}
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

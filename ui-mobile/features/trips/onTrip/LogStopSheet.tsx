// Path: ui-mobile/features/trips/onTrip/LogStopSheet.tsx
// Summary: Implements LogStopSheet module logic.

import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { usePlaceAutocomplete } from "@/features/trips/usePlaceAutocomplete";
import { TextInputField } from "@/shared/ui/TextInputField";
import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";
import type { PlaceSuggestion } from "@/features/trips/types";

type Props = {
  visible: boolean;
  defaultDate: string;
  disabled: boolean;
  quickMode?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    day_date: string;
    title: string;
    time?: string | null;
    location?: string | null;
    notes?: string | null;
  }) => Promise<void>;
};

const QUICK_LOG_PRESETS = [
  "Coffee stop",
  "Snack break",
  "Viewpoint",
  "Street wander",
] as const;

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function LogStopSheet({
  visible,
  defaultDate,
  disabled,
  quickMode = false,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(localTimeHHMM());
  const [notes, setNotes] = useState("");
  const [showFullForm, setShowFullForm] = useState(!quickMode);
  const [showNoteField, setShowNoteField] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const locationBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setTime(localTimeHHMM());
    resetLocationAutocomplete("");
    setNotes("");
    setShowFullForm(!quickMode);
    setShowNoteField(false);
    setLocationFocused(false);
    if (locationBlurTimeoutRef.current) {
      clearTimeout(locationBlurTimeoutRef.current);
      locationBlurTimeoutRef.current = null;
    }
  }, [quickMode, visible, resetLocationAutocomplete]);

  useEffect(() => {
    return () => {
      if (!locationBlurTimeoutRef.current) return;
      clearTimeout(locationBlurTimeoutRef.current);
      locationBlurTimeoutRef.current = null;
    };
  }, []);

  const canSubmit = !disabled && title.trim().length > 0;
  const canUseQuickPresets = quickMode && !showFullForm;
  const trimmedLocation = locationQuery.trim();
  const shouldShowLocationSuggestions =
    locationFocused && trimmedLocation.length >= locationMinQueryLength;
  const shouldShowLocationEmpty =
    shouldShowLocationSuggestions &&
    hasSearchedLocation &&
    !isSearchingLocation &&
    !locationSearchError &&
    locationSuggestions.length === 0;

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
          <View className="rounded-t-[24px] bg-surface-ontrip-raised px-4 pb-5 pt-3">
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-border-ontrip-strong" />
            </View>
            <Text className="text-lg text-ontrip" style={fontStyles.uiSemibold}>
              Log a stop
            </Text>
            <Text
              className="mt-0.5 text-[12px] leading-4 text-ontrip-muted"
              style={fontStyles.uiRegular}
            >
              Save somewhere you visited outside the plan.
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="mt-4 gap-3">
                {canUseQuickPresets ? (
                  <>
                    <Text
                      className="text-[11px] uppercase tracking-[1.6px] text-ontrip-muted"
                      style={fontStyles.monoRegular}
                    >
                      Quick capture
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {QUICK_LOG_PRESETS.map((preset) => (
                        <Pressable
                          key={preset}
                          disabled={disabled}
                          onPress={() =>
                            void onSubmit({
                              day_date: defaultDate,
                              title: preset,
                              time: localTimeHHMM(),
                              location: null,
                              notes: null,
                            })
                          }
                          className={[
                            "rounded-full border border-border-ontrip-strong bg-surface-ontrip px-3 py-2",
                            disabled ? "opacity-50" : "active:opacity-80",
                          ].join(" ")}
                        >
                          <Text
                            className="text-[12px] text-ontrip"
                            style={fontStyles.uiMedium}
                          >
                            {preset}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => setShowFullForm(true)}
                      className="self-start pt-1"
                      accessibilityRole="button"
                      accessibilityLabel="Add details for this stop"
                    >
                      <Text
                        className="text-[12px] text-ontrip-muted"
                        style={fontStyles.uiMedium}
                      >
                        Add details instead
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <TextInputField
                      label="Title"
                      hint="Required"
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Coffee break"
                      className="border-border-ontrip-strong px-4 py-3.5 text-[16px]"
                    />
                    <View className="gap-2">
                      <View className="flex-row gap-2">
                        <View className="w-[96px] gap-1">
                          <Text
                            className="text-[11px] text-ontrip-muted"
                            style={fontStyles.uiMedium}
                          >
                            Time
                          </Text>
                          <TextInput
                            value={time}
                            onChangeText={setTime}
                            placeholder="Now"
                            placeholderTextColor="#8A7E74"
                            className="min-h-10 rounded-full border border-border-ontrip bg-surface-ontrip px-3 text-[13px] text-ontrip"
                            style={fontStyles.uiRegular}
                          />
                        </View>
                        <View className="flex-1 gap-1">
                          <Text
                            className="text-[11px] text-ontrip-muted"
                            style={fontStyles.uiMedium}
                          >
                            Location
                          </Text>
                          <TextInput
                            value={locationQuery}
                            onChangeText={onLocationQueryChange}
                            onFocus={() => {
                              if (locationBlurTimeoutRef.current) {
                                clearTimeout(locationBlurTimeoutRef.current);
                                locationBlurTimeoutRef.current = null;
                              }
                              setLocationFocused(true);
                            }}
                            onBlur={() => {
                              locationBlurTimeoutRef.current = setTimeout(
                                () => {
                                  setLocationFocused(false);
                                  locationBlurTimeoutRef.current = null;
                                },
                                120,
                              );
                            }}
                            placeholder="Where?"
                            placeholderTextColor="#8A7E74"
                            className="min-h-10 rounded-full border border-border-ontrip bg-surface-ontrip px-3 text-[13px] text-ontrip"
                            style={fontStyles.uiRegular}
                          />
                        </View>
                      </View>
                      {shouldShowLocationSuggestions ? (
                        <LocationSuggestions
                          loading={isSearchingLocation}
                          searchError={locationSearchError}
                          suggestions={locationSuggestions}
                          empty={shouldShowLocationEmpty}
                          onSelect={(suggestion) => {
                            if (locationBlurTimeoutRef.current) {
                              clearTimeout(locationBlurTimeoutRef.current);
                              locationBlurTimeoutRef.current = null;
                            }
                            setLocationFocused(false);
                            onLocationSuggestionSelect(suggestion);
                          }}
                        />
                      ) : null}
                    </View>
                    {showNoteField ? (
                      <TextInputField
                        label="Notes"
                        hint="Optional"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Short note"
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                        className="min-h-[68px] bg-surface-ontrip-raised px-3.5 py-2.5 text-[14px]"
                      />
                    ) : (
                      <Pressable
                        onPress={() => setShowNoteField(true)}
                        className="self-start px-1 py-1"
                        accessibilityRole="button"
                        accessibilityLabel="Add note"
                      >
                        <Text
                          className="text-[12px] text-ontrip-muted"
                          style={fontStyles.uiMedium}
                        >
                          Add note
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}

                {!canUseQuickPresets ? (
                  <View className="mt-1 flex-row items-center justify-end gap-2">
                    <Pressable
                      onPress={onClose}
                      className="min-h-10 items-center justify-center rounded-full border border-border-ontrip-strong bg-surface-ontrip px-4 py-2.5"
                    >
                      <Text
                        className="text-[13px] text-ontrip-strong"
                        style={fontStyles.uiSemibold}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void onSubmit({
                          day_date: defaultDate,
                          title: title.trim(),
                          time: time.trim() || null,
                          location: locationQuery.trim() || null,
                          notes: notes.trim() || null,
                        })
                      }
                      disabled={!canSubmit}
                      className={[
                        "min-h-10 items-center justify-center rounded-full bg-accent-ontrip px-5 py-2.5",
                        canSubmit ? "active:opacity-90" : "opacity-50",
                      ].join(" ")}
                    >
                      <Text
                        className="text-[13px]"
                        style={[fontStyles.uiSemibold, { color: DE.ivory }]}
                      >
                        {disabled ? "Saving…" : "Save stop"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {canUseQuickPresets ? (
                  <Pressable
                    onPress={onClose}
                    className="min-h-10 items-center justify-center self-start rounded-full border border-border-ontrip-strong bg-surface-ontrip px-4 py-2.5"
                  >
                    <Text
                      className="text-[13px] text-ontrip-strong"
                      style={fontStyles.uiSemibold}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function buildDetailLine(suggestion: PlaceSuggestion): string | null {
  const detail = [suggestion.city, suggestion.region, suggestion.country]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  if (!detail) return null;
  if (detail.toLowerCase() === suggestion.label.toLowerCase()) return null;
  return detail;
}

function LocationSuggestions({
  loading,
  searchError,
  suggestions,
  empty,
  onSelect,
}: {
  loading: boolean;
  searchError?: string | null;
  suggestions: PlaceSuggestion[];
  empty: boolean;
  onSelect: (suggestion: PlaceSuggestion) => void;
}) {
  if (loading) {
    return (
      <View className="rounded-2xl border border-border-ontrip bg-surface-ontrip px-3 py-2">
        <Text
          className="text-[12px] text-ontrip-muted"
          style={fontStyles.uiRegular}
        >
          Searching places...
        </Text>
      </View>
    );
  }

  if (searchError) {
    return (
      <View className="rounded-2xl border border-border-ontrip bg-surface-ontrip px-3 py-2">
        <Text className="text-[12px] text-danger" style={fontStyles.uiRegular}>
          {searchError}
        </Text>
      </View>
    );
  }

  if (empty) {
    return (
      <View className="rounded-2xl border border-border-ontrip bg-surface-ontrip px-3 py-2">
        <Text
          className="text-[12px] text-ontrip-muted"
          style={fontStyles.uiRegular}
        >
          No places found.
        </Text>
      </View>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <View className="overflow-hidden rounded-2xl border border-border-ontrip bg-surface-ontrip">
      {suggestions.slice(0, 5).map((suggestion, index, rows) => {
        const detailLine = buildDetailLine(suggestion);
        const showDivider = index < rows.length - 1;

        return (
          <Pressable
            key={suggestion.id}
            onPressIn={() => onSelect(suggestion)}
            className={[
              "px-3 py-2.5 active:bg-surface-ontrip-sunken",
              showDivider ? "border-b border-border-ontrip" : "",
            ].join(" ")}
          >
            <Text
              className="text-[13px] text-ontrip"
              style={fontStyles.uiMedium}
            >
              {suggestion.label}
            </Text>
            {detailLine ? (
              <Text
                className="mt-0.5 text-[11px] text-ontrip-muted"
                style={fontStyles.uiRegular}
              >
                {detailLine}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

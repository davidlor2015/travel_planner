// Path: ui-mobile/features/trips/onTrip/LogStopSheet.tsx
// Summary: Implements LogStopSheet module logic.

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { PlaceAutocompleteInput } from "@/features/trips/PlaceAutocompleteInput";
import { usePlaceAutocomplete } from "@/features/trips/usePlaceAutocomplete";
import { TextInputField } from "@/shared/ui/TextInputField";
import { fontStyles } from "@/shared/theme/typography";

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
  }, [quickMode, visible, resetLocationAutocomplete]);

  const canSubmit = !disabled && title.trim().length > 0;
  const canUseQuickPresets = quickMode && !showFullForm;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="rounded-t-[28px] bg-surface-ontrip-raised px-4 pb-8 pt-4">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-border-ontrip-strong" />
            </View>
            <Text className="text-xl text-ontrip" style={fontStyles.uiSemibold}>
              Log a stop
            </Text>
            <Text className="mt-1 text-sm text-ontrip-muted" style={fontStyles.uiRegular}>
              Capture something that actually happened. Logged for {defaultDate}.
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="mt-4 gap-3">
                {canUseQuickPresets ? (
                  <>
                    <Text
                      className="text-[12px] uppercase tracking-[1.8px] text-ontrip-muted"
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
                            "rounded-full border border-border-ontrip-strong bg-surface-ontrip px-3.5 py-2.5",
                            disabled ? "opacity-50" : "active:opacity-80",
                          ].join(" ")}
                        >
                          <Text className="text-[12px] text-ontrip" style={fontStyles.uiMedium}>
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
                      <Text className="text-[12px] text-ontrip-muted" style={fontStyles.uiMedium}>
                        Add details instead
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <TextInputField
                      label="Title"
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Coffee break"
                    />
                    <TextInputField
                      label="Time"
                      value={time}
                      onChangeText={setTime}
                      placeholder="16:30"
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
                    <TextInputField
                      label="Notes"
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Optional"
                      multiline
                    />
                  </>
                )}

                {!canUseQuickPresets ? (
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
                      "min-h-11 items-center justify-center rounded-full bg-accent-ontrip px-4 py-3",
                      canSubmit ? "active:opacity-90" : "opacity-50",
                    ].join(" ")}
                  >
                    <Text className="text-sm text-white" style={fontStyles.uiSemibold}>
                      {disabled ? "Saving…" : "Save stop"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={onClose}
                  className="min-h-11 items-center justify-center rounded-full border border-border-ontrip-strong bg-surface-ontrip px-4 py-3"
                >
                  <Text className="text-sm text-ontrip-strong" style={fontStyles.uiSemibold}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Path: ui-mobile/features/trips/PlaceAutocompleteInput.tsx
// Summary: Implements PlaceAutocompleteInput module logic.

import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Field } from "@/shared/ui/Field";
import { fontStyles } from "@/shared/theme/typography";

import type { PlaceSuggestion } from "./types";

type Props = {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  error?: string | null;
  minQueryLength?: number;
  hasSearched?: boolean;
  loading?: boolean;
  searchError?: string | null;
  suggestions: PlaceSuggestion[];
  onChangeText: (text: string) => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
};

function buildDetailLine(suggestion: PlaceSuggestion): string | null {
  const detail = [suggestion.city, suggestion.region, suggestion.country]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  if (!detail) return null;
  if (detail.toLowerCase() === suggestion.label.toLowerCase()) return null;
  return detail;
}

export function PlaceAutocompleteInput({
  label,
  hint,
  placeholder,
  value,
  error,
  minQueryLength = 2,
  hasSearched = false,
  loading = false,
  searchError,
  suggestions,
  onChangeText,
  onSelectSuggestion,
}: Props) {
  const [focused, setFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (!blurTimeoutRef.current) return;
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    };
  }, []);

  const trimmedValue = value.trim();
  const shouldShowDropdown = focused && trimmedValue.length >= minQueryLength;
  const shouldShowEmpty =
    shouldShowDropdown &&
    hasSearched &&
    !loading &&
    !searchError &&
    suggestions.length === 0;

  return (
    <Field label={label} hint={hint} error={error}>
      <View className="gap-2">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            setFocused(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setFocused(false);
              blurTimeoutRef.current = null;
            }, 120);
          }}
          placeholder={placeholder}
          placeholderTextColor="#8A7E74"
          className={[
            "rounded-2xl border border-border bg-white px-4 py-3 text-[15px] text-text",
            error ? "border-danger" : "",
          ].join(" ")}
          style={fontStyles.uiRegular}
        />

        {shouldShowDropdown ? (
          <View className="overflow-hidden rounded-2xl border border-border bg-white">
            {loading ? (
              <View className="px-4 py-3">
                <Text className="text-sm text-text-muted" style={fontStyles.uiRegular}>
                  Searching places…
                </Text>
              </View>
            ) : null}

            {!loading && searchError ? (
              <View className="px-4 py-3">
                <Text className="text-sm text-danger" style={fontStyles.uiRegular}>
                  {searchError}
                </Text>
              </View>
            ) : null}

            {!loading && !searchError
              ? suggestions.slice(0, 8).map((suggestion, index, rows) => {
                  const detailLine = buildDetailLine(suggestion);
                  const showDivider = index < rows.length - 1;
                  return (
                    <Pressable
                      key={suggestion.id}
                      onPressIn={() => {
                        if (blurTimeoutRef.current) {
                          clearTimeout(blurTimeoutRef.current);
                          blurTimeoutRef.current = null;
                        }
                        setFocused(false);
                        onSelectSuggestion(suggestion);
                      }}
                      className={[
                        "px-4 py-3 active:bg-surface-muted",
                        showDivider ? "border-b border-border/70" : "",
                      ].join(" ")}
                    >
                      <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                        {suggestion.label}
                      </Text>
                      {detailLine ? (
                        <Text
                          className="mt-0.5 text-xs text-text-soft"
                          style={fontStyles.uiRegular}
                        >
                          {detailLine}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              : null}

            {shouldShowEmpty ? (
              <View className="px-4 py-3">
                <Text className="text-sm text-text-muted" style={fontStyles.uiRegular}>
                  No places found.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Field>
  );
}

// Path: ui-mobile/features/trips/DestinationPickerSheet.tsx
// Summary: Implements the trip destination picker sheet.

import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontStyles } from "@/shared/theme/typography";

import type { PlaceSuggestion, SelectedDestination } from "./types";

const FALLBACK_DESTINATIONS: SelectedDestination[] = [
  {
    id: "fallback:lisbon-portugal",
    name: "Lisbon",
    displayName: "Lisbon, Portugal",
    country: "Portugal",
    source: "fallback",
  },
  {
    id: "fallback:kyoto-japan",
    name: "Kyoto",
    displayName: "Kyoto, Japan",
    country: "Japan",
    source: "fallback",
  },
  {
    id: "fallback:rome-italy",
    name: "Rome",
    displayName: "Rome, Italy",
    country: "Italy",
    source: "fallback",
  },
  {
    id: "fallback:mexico-city-mexico",
    name: "Mexico City",
    displayName: "Mexico City, Mexico",
    country: "Mexico",
    source: "fallback",
  },
  {
    id: "fallback:cape-town-south-africa",
    name: "Cape Town",
    displayName: "Cape Town, South Africa",
    country: "South Africa",
    source: "fallback",
  },
];

type Props = {
  visible: boolean;
  query: string;
  suggestions: PlaceSuggestion[];
  loading: boolean;
  searchError?: string | null;
  hasSearched: boolean;
  minQueryLength: number;
  onChangeQuery: (query: string) => void;
  onSelectDestination: (destination: SelectedDestination) => void;
  onClose: () => void;
};

function buildDetailLine(suggestion: PlaceSuggestion): string | null {
  const detail = [suggestion.city, suggestion.region, suggestion.country]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  if (!detail) return null;
  if (detail.toLowerCase() === suggestion.label.toLowerCase()) return null;
  return detail;
}

function buildSelectedDestination(
  suggestion: PlaceSuggestion,
): SelectedDestination {
  const name =
    suggestion.city ??
    suggestion.label.split(",").map((part) => part.trim()).find(Boolean) ??
    suggestion.label;

  return {
    id: suggestion.id,
    name,
    displayName: suggestion.label,
    latitude: suggestion.latitude ?? undefined,
    longitude: suggestion.longitude ?? undefined,
    country: suggestion.country ?? undefined,
    countryCode: suggestion.country_code ?? undefined,
    region: suggestion.region ?? undefined,
    source: suggestion.source ?? "place_search",
  };
}

export function DestinationPickerSheet({
  visible,
  query,
  suggestions,
  loading,
  searchError,
  hasSearched,
  minQueryLength,
  onChangeQuery,
  onSelectDestination,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const trimmedQuery = query.trim();
  const canShowSearchState = trimmedQuery.length >= minQueryLength;
  const showStartState = trimmedQuery.length === 0;
  const showEmpty =
    canShowSearchState &&
    hasSearched &&
    !loading &&
    !searchError &&
    suggestions.length === 0;
  const showFallback = showStartState || Boolean(!loading && searchError);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/30"
      >
        <View
          className="max-h-[92%] rounded-t-[28px] bg-bg pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
          <View className="flex-row items-start justify-between px-4 pb-3">
            <View className="flex-1 pr-4">
              <Text className="text-lg text-text" style={fontStyles.uiSemibold}>
                Where are you going?
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close destination search"
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-white"
            >
              <Ionicons name="close" size={21} color="#8A7E74" />
            </Pressable>
          </View>

          <View className="px-4">
            <View className="flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="search-outline" size={16} color="#8A7E74" />
              <TextInput
                value={query}
                onChangeText={onChangeQuery}
                placeholder="Search a city, region, landmark, or airport"
                placeholderTextColor="#8A7E74"
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Search destinations"
                className="min-h-12 flex-1 px-2 text-[15px] text-text"
                style={fontStyles.uiRegular}
              />
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          >
            {showStartState ? (
              <FallbackDestinations
                title="Popular destinations"
                destinations={FALLBACK_DESTINATIONS}
                onSelectDestination={onSelectDestination}
              />
            ) : null}

            {!showStartState && !canShowSearchState ? (
              <StateMessage
                icon="search-outline"
                text={`Enter at least ${minQueryLength} characters.`}
                accessibilityLabel={`Enter at least ${minQueryLength} characters to search destinations`}
              />
            ) : null}

            {loading ? (
              <StateMessage
                icon="search-outline"
                text="Searching destinations…"
                accessibilityLabel="Searching destinations"
              />
            ) : null}

            {!loading && searchError ? (
              <>
                <StateMessage
                  icon="alert-circle-outline"
                  text="Couldn't search destinations. Try again."
                  tone="danger"
                  accessibilityLabel="Couldn't search destinations. Try again."
                />
                {showFallback ? (
                  <View className="mt-3">
                    <FallbackDestinations
                      title="Try one of these"
                      destinations={FALLBACK_DESTINATIONS}
                      onSelectDestination={onSelectDestination}
                    />
                  </View>
                ) : null}
              </>
            ) : null}

            {!loading && !searchError && suggestions.length > 0 ? (
              <View className="overflow-hidden rounded-2xl border border-border bg-white">
                {suggestions.slice(0, 10).map((suggestion, index, rows) => {
                  const detailLine = buildDetailLine(suggestion);
                  const showDivider = index < rows.length - 1;
                  return (
                    <Pressable
                      key={suggestion.id}
                      onPress={() => onSelectDestination(buildSelectedDestination(suggestion))}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose destination ${suggestion.label}`}
                      className={[
                        "flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted",
                        showDivider ? "border-b border-border/70" : "",
                      ].join(" ")}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted">
                        <Ionicons name="location-outline" size={17} color="#B86845" />
                      </View>
                      <View className="min-w-0 flex-1">
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
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#8A7E74" />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {showEmpty ? (
              <StateMessage
                icon="search-outline"
                text="No matching places found."
                accessibilityLabel="No matching places found."
              />
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FallbackDestinations({
  title,
  destinations,
  onSelectDestination,
}: {
  title: string;
  destinations: SelectedDestination[];
  onSelectDestination: (destination: SelectedDestination) => void;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs text-text-soft" style={fontStyles.uiSemibold}>
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-white">
        {destinations.map((destination, index) => {
          const showDivider = index < destinations.length - 1;
          return (
            <Pressable
              key={destination.id}
              onPress={() => onSelectDestination(destination)}
              accessibilityRole="button"
              accessibilityLabel={`Choose destination ${destination.displayName}`}
              className={[
                "flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted",
                showDivider ? "border-b border-border/70" : "",
              ].join(" ")}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted">
                <Ionicons name="location-outline" size={17} color="#B86845" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-text" style={fontStyles.uiMedium}>
                  {destination.displayName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#8A7E74" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StateMessage({
  icon,
  text,
  tone = "muted",
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  text: string;
  tone?: "muted" | "danger";
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className="items-center rounded-2xl border border-border bg-white px-4 py-6"
    >
      <Ionicons
        name={icon}
        size={22}
        color={tone === "danger" ? "#B86845" : "#8A7E74"}
      />
      <Text
        className={[
          "mt-2 text-center text-sm",
          tone === "danger" ? "text-danger" : "text-text-muted",
        ].join(" ")}
        style={fontStyles.uiRegular}
      >
        {text}
      </Text>
    </View>
  );
}

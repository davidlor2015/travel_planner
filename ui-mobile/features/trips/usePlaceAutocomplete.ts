// Path: ui-mobile/features/trips/usePlaceAutocomplete.ts
// Summary: Provides usePlaceAutocomplete hook behavior.

import { useCallback, useEffect, useState } from "react";

import { searchPlaces } from "./api";
import type {
  PlaceSearchApiResponse,
  PlaceSearchApiSuggestion,
  PlaceSuggestion,
} from "./types";

type UsePlaceAutocompleteOptions = {
  initialQuery?: string;
  debounceMs?: number;
  minQueryLength?: number;
  searchOnInit?: boolean;
};

export type UsePlaceAutocompleteResult = {
  query: string;
  suggestions: PlaceSuggestion[];
  selectedPlace: PlaceSuggestion | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  minQueryLength: number;
  onQueryChange: (nextQuery: string) => void;
  selectSuggestion: (suggestion: PlaceSuggestion) => void;
  clearSuggestions: () => void;
  reset: (nextQuery?: string) => void;
};

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readRows(response: PlaceSearchApiResponse): PlaceSearchApiSuggestion[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.suggestions)) return response.suggestions;
  if (Array.isArray(response.places)) return response.places;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function normalizePlaceSuggestion(
  suggestion: PlaceSearchApiSuggestion,
  index: number,
): PlaceSuggestion | null {
  const city = asText(suggestion.city) ?? asText(suggestion.name);
  const region = asText(suggestion.region) ?? asText(suggestion.state);
  const country = asText(suggestion.country);
  const label =
    asText(suggestion.label) ??
    asText(suggestion.displayName) ??
    asText(suggestion.display_name) ??
    [city, region, country].filter((part): part is string => Boolean(part)).join(", ");

  if (!label) return null;

  const id =
    asText(suggestion.id) ??
    asText(suggestion.place_id) ??
    `${label.toLowerCase().replace(/\s+/g, "-")}-${index}`;

  const countryCode = asText(suggestion.countryCode) ?? asText(suggestion.country_code);

  return {
    id,
    label,
    city: city ?? null,
    region: region ?? null,
    country: country ?? null,
    country_code: countryCode ? countryCode.toUpperCase() : null,
    latitude: asNumber(suggestion.latitude) ?? asNumber(suggestion.lat),
    longitude: asNumber(suggestion.longitude) ?? asNumber(suggestion.lon),
    source: asText(suggestion.source),
  };
}

function normalizePlaceSuggestions(response: PlaceSearchApiResponse): PlaceSuggestion[] {
  const seen = new Set<string>();
  const rows = readRows(response);
  const normalized: PlaceSuggestion[] = [];

  rows.forEach((row, index) => {
    const suggestion = normalizePlaceSuggestion(row, index);
    if (!suggestion) return;

    const key = `${suggestion.id}:${suggestion.label.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(suggestion);
  });

  return normalized;
}

export function usePlaceAutocomplete(
  options: UsePlaceAutocompleteOptions = {},
): UsePlaceAutocompleteResult {
  const {
    initialQuery = "",
    debounceMs = 300,
    minQueryLength = 2,
    searchOnInit = false,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [hasTypedQuery, setHasTypedQuery] = useState(searchOnInit);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(timeout);
  }, [query, debounceMs]);

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim();
    const selectedLabel = selectedPlace?.label.trim().toLowerCase() ?? null;
    const matchesSelectedLabel = Boolean(
      selectedLabel && normalizedQuery.toLowerCase() === selectedLabel,
    );

    const shouldSearch =
      normalizedQuery.length >= minQueryLength &&
      (searchOnInit || hasTypedQuery) &&
      !matchesSelectedLabel;

    if (!shouldSearch) {
      setIsLoading(false);
      setSuggestions([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setHasSearched(false);

    void searchPlaces(normalizedQuery)
      .then((response) => {
        if (cancelled) return;
        setSuggestions(normalizePlaceSuggestions(response));
        setHasSearched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setError("We couldn't load places right now.");
        setHasSearched(true);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    debouncedQuery,
    hasTypedQuery,
    minQueryLength,
    searchOnInit,
    selectedPlace?.label,
  ]);

  const onQueryChange = useCallback((nextQuery: string) => {
    setHasTypedQuery(true);
    setQuery(nextQuery);
    setSelectedPlace((current) => {
      if (!current) return null;
      const nextLabel = nextQuery.trim().toLowerCase();
      const currentLabel = current.label.trim().toLowerCase();
      return nextLabel === currentLabel ? current : null;
    });
  }, []);

  const selectSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    setSelectedPlace(suggestion);
    setQuery(suggestion.label);
    setDebouncedQuery(suggestion.label);
    setSuggestions([]);
    setError(null);
    setHasSearched(false);
    setIsLoading(false);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setHasSearched(false);
    setError(null);
  }, []);

  const reset = useCallback((nextQuery = "") => {
    setQuery(nextQuery);
    setDebouncedQuery(nextQuery);
    setHasTypedQuery(searchOnInit);
    setSuggestions([]);
    setSelectedPlace(null);
    setError(null);
    setHasSearched(false);
    setIsLoading(false);
  }, [searchOnInit]);

  return {
    query,
    suggestions,
    selectedPlace,
    isLoading,
    error,
    hasSearched,
    minQueryLength,
    onQueryChange,
    selectSuggestion,
    clearSuggestions,
    reset,
  };
}

// Path: ui-mobile/features/profile/preferences/useAppPreferences.ts
// Summary: Provides useAppPreferences hook behavior.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

export type AppPreferences = {
  currency: string;
  distanceUnit: "mi" | "km";
  timeFormat: "12h" | "24h";
  tripRemindersEnabled: boolean;
  inviteAlertsEnabled: boolean;
  onTripRemindersEnabled: boolean;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  currency: "USD",
  distanceUnit: "mi",
  timeFormat: "12h",
  tripRemindersEnabled: true,
  inviteAlertsEnabled: true,
  onTripRemindersEnabled: true,
};

export const STORAGE_KEY = "roen.preferences";

export type UseAppPreferencesResult = {
  preferences: AppPreferences;
  isLoaded: boolean;
  update: (patch: Partial<AppPreferences>) => Promise<void>;
};

export function useAppPreferences(): UseAppPreferencesResult {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ref so `update` can always read the latest value without being recreated.
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AppPreferences>;
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch {
          // malformed stored data — fall through to defaults
        }
      }
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppPreferences>): Promise<void> => {
    const next = { ...preferencesRef.current, ...patch };
    setPreferences(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { preferences, isLoaded, update };
}

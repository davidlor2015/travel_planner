// Path: ui-mobile/__tests__/profile/useAppPreferences.test.ts
// Summary: Provides useAppPreferences.test hook behavior.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  useAppPreferences,
  type AppPreferences,
} from "@/features/profile/preferences/useAppPreferences";
import {
  buildDefaultsSubtext,
  buildNotificationsSubtext,
} from "@/features/profile/preferences/preferencePresentation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedStorage(prefs: Partial<AppPreferences>) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PREFERENCES, ...prefs }),
  );
}

// ─── useAppPreferences ────────────────────────────────────────────────────────

describe("useAppPreferences", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns defaults when AsyncStorage is empty", async () => {
    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it("loads previously persisted preferences from AsyncStorage", async () => {
    await seedStorage({ currency: "EUR", distanceUnit: "km" });

    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.preferences.currency).toBe("EUR");
    expect(result.current.preferences.distanceUnit).toBe("km");
    // Fields not overridden still come from defaults
    expect(result.current.preferences.timeFormat).toBe(DEFAULT_PREFERENCES.timeFormat);
  });

  it("merges stored values with defaults so new fields don't crash", async () => {
    // Simulate an older stored object that's missing a key added later
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ currency: "GBP" }), // no other keys
    );

    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.preferences.currency).toBe("GBP");
    expect(result.current.preferences.distanceUnit).toBe(DEFAULT_PREFERENCES.distanceUnit);
  });

  it("falls back to defaults when stored JSON is malformed", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "not-json{{");

    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it("update() patches state immediately and writes to AsyncStorage", async () => {
    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.update({ currency: "JPY" });
    });

    expect(result.current.preferences.currency).toBe("JPY");

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!) as AppPreferences;
    expect(stored.currency).toBe("JPY");
  });

  it("update() preserves unchanged fields", async () => {
    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.update({ distanceUnit: "km" });
    });

    expect(result.current.preferences.currency).toBe(DEFAULT_PREFERENCES.currency);
    expect(result.current.preferences.distanceUnit).toBe("km");
    expect(result.current.preferences.timeFormat).toBe(DEFAULT_PREFERENCES.timeFormat);
  });

  it("sequential updates accumulate correctly", async () => {
    const { result } = renderHook(() => useAppPreferences());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.update({ currency: "AUD" });
    });
    await act(async () => {
      await result.current.update({ timeFormat: "24h" });
    });

    expect(result.current.preferences.currency).toBe("AUD");
    expect(result.current.preferences.timeFormat).toBe("24h");
  });
});

// ─── buildDefaultsSubtext ────────────────────────────────────────────────────

describe("buildDefaultsSubtext", () => {
  it("formats USD + miles + 12-hour", () => {
    expect(
      buildDefaultsSubtext({ ...DEFAULT_PREFERENCES, currency: "USD", distanceUnit: "mi", timeFormat: "12h" }),
    ).toBe("USD · Miles · 12-hour");
  });

  it("formats EUR + km + 24-hour", () => {
    expect(
      buildDefaultsSubtext({ ...DEFAULT_PREFERENCES, currency: "EUR", distanceUnit: "km", timeFormat: "24h" }),
    ).toBe("EUR · Km · 24-hour");
  });

  it("reflects any currency string directly", () => {
    expect(
      buildDefaultsSubtext({ ...DEFAULT_PREFERENCES, currency: "JPY" }),
    ).toBe("JPY · Miles · 12-hour");
  });
});

// ─── buildNotificationsSubtext ───────────────────────────────────────────────

describe("buildNotificationsSubtext", () => {
  it('returns "All on" when all three toggles are enabled', () => {
    expect(
      buildNotificationsSubtext({
        ...DEFAULT_PREFERENCES,
        tripRemindersEnabled: true,
        inviteAlertsEnabled: true,
        onTripRemindersEnabled: true,
      }),
    ).toBe("All on");
  });

  it('returns "Off" when all three toggles are disabled', () => {
    expect(
      buildNotificationsSubtext({
        ...DEFAULT_PREFERENCES,
        tripRemindersEnabled: false,
        inviteAlertsEnabled: false,
        onTripRemindersEnabled: false,
      }),
    ).toBe("Off");
  });

  it('returns "Some on" for partial enablement', () => {
    expect(
      buildNotificationsSubtext({
        ...DEFAULT_PREFERENCES,
        tripRemindersEnabled: true,
        inviteAlertsEnabled: false,
        onTripRemindersEnabled: false,
      }),
    ).toBe("Some on");

    expect(
      buildNotificationsSubtext({
        ...DEFAULT_PREFERENCES,
        tripRemindersEnabled: false,
        inviteAlertsEnabled: true,
        onTripRemindersEnabled: true,
      }),
    ).toBe("Some on");
  });
});

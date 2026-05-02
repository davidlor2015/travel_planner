// @vitest-environment jsdom
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { getTripOnTripSnapshot } from "@/features/trips/api";
import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import {
  readOnTripSnapshotCache,
  writeOnTripSnapshotCache,
} from "@/features/trips/onTrip/cache";
import type { TripOnTripSnapshot } from "@/features/trips/types";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/features/trips/api", () => {
  const original = jest.requireActual("@/features/trips/api");
  return {
    ...original,
    getTripOnTripSnapshot: jest.fn(),
  };
});

const mockedGetTripOnTripSnapshot = getTripOnTripSnapshot as jest.MockedFunction<
  typeof getTripOnTripSnapshot
>;

const NULL_STOP = {
  day_number: null,
  day_date: null,
  title: null,
  time: null,
  location: null,
  notes: null,
  lat: null,
  lon: null,
  status: "planned" as const,
  source: "none" as const,
  confidence: "low" as const,
  stop_ref: null,
  execution_status: null,
};

function buildSnapshot(
  tripDayDate: string,
  overrides: Partial<TripOnTripSnapshot> = {},
): TripOnTripSnapshot {
  return {
    generated_at: `${tripDayDate}T08:00:00Z`,
    mode: "active",
    read_only: false,
    today: { ...NULL_STOP, day_number: 1, day_date: tripDayDate },
    today_stops: [
      { ...NULL_STOP, title: "Coffee", day_number: 1, day_date: tripDayDate },
    ],
    today_unplanned: [],
    next_stop: { ...NULL_STOP, title: "Coffee", day_number: 1, day_date: tripDayDate },
    blockers: [],
    ...overrides,
  };
}

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return QueryWrapper;
}

describe("useOnTripSnapshotQuery cache behavior", () => {
  beforeEach(async () => {
    mockedGetTripOnTripSnapshot.mockReset();
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it("shows cached data before network refresh resolves", async () => {
    await writeOnTripSnapshotCache(12, buildSnapshot("2026-11-03"));

    mockedGetTripOnTripSnapshot.mockImplementation(
      () => new Promise<TripOnTripSnapshot>(() => {}),
    );

    const { result } = renderHook(() => useOnTripSnapshotQuery(12), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.today.day_date).toBe("2026-11-03");
    });
    expect(result.current.hasCachedData).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("persists successful refresh results back into cache", async () => {
    await writeOnTripSnapshotCache(77, buildSnapshot("2026-11-03"));
    mockedGetTripOnTripSnapshot.mockResolvedValue(buildSnapshot("2026-11-04"));

    const { result } = renderHook(() => useOnTripSnapshotQuery(77), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.today.day_date).toBe("2026-11-04");
    });

    await waitFor(async () => {
      const cached = await readOnTripSnapshotCache(77);
      expect(cached?.snapshot.today.day_date).toBe("2026-11-04");
    });
  });

  it("keeps cached data visible when refresh fails", async () => {
    await writeOnTripSnapshotCache(31, buildSnapshot("2026-11-03"));
    mockedGetTripOnTripSnapshot.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useOnTripSnapshotQuery(31), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.today.day_date).toBe("2026-11-03");
    });
    await waitFor(() => {
      expect(result.current.refreshFailedWithCache).toBe(true);
    });

    expect(result.current.isError).toBe(false);
  });
});

describe("on-trip cache key scope", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("separates cache entries by trip id", async () => {
    jest.setSystemTime(new Date("2026-11-03T09:00:00Z"));
    await writeOnTripSnapshotCache(1, buildSnapshot("2026-11-03"));
    await writeOnTripSnapshotCache(2, buildSnapshot("2026-11-03"));

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((key) => key.includes(":1:"))).toBe(true);
    expect(keys.some((key) => key.includes(":2:"))).toBe(true);
  });

  it("does not leak previous-day cache into a new day", async () => {
    jest.setSystemTime(new Date("2026-11-03T09:00:00Z"));
    await writeOnTripSnapshotCache(42, buildSnapshot("2026-11-03"));

    jest.setSystemTime(new Date("2026-11-04T09:00:00Z"));
    const cached = await readOnTripSnapshotCache(42);

    expect(cached).toBeNull();
  });
});

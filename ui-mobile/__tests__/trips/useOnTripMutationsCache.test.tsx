// @vitest-environment jsdom
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useOnTripMutations } from "@/features/trips/onTrip/hooks";
import {
  readOnTripSnapshotCache,
  writeOnTripSnapshotCache,
} from "@/features/trips/onTrip/cache";
import type { TripOnTripSnapshot } from "@/features/trips/types";
import {
  getTripOnTripSnapshot,
  postStopStatus,
} from "@/features/trips/api";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("@/features/trips/api", () => {
  const original = jest.requireActual("@/features/trips/api");
  return {
    ...original,
    postStopStatus: jest.fn(),
    getTripOnTripSnapshot: jest.fn(),
  };
});

const mockedPostStopStatus = postStopStatus as jest.MockedFunction<typeof postStopStatus>;
const mockedGetTripOnTripSnapshot =
  getTripOnTripSnapshot as jest.MockedFunction<typeof getTripOnTripSnapshot>;

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

function buildSnapshot(): TripOnTripSnapshot {
  return {
    generated_at: "2026-11-03T08:00:00Z",
    mode: "active",
    read_only: false,
    today: { ...NULL_STOP, day_number: 2, day_date: "2026-11-03" },
    today_stops: [
      {
        ...NULL_STOP,
        stop_ref: "stop-1",
        title: "Museum",
        day_number: 2,
        day_date: "2026-11-03",
      },
    ],
    today_unplanned: [],
    next_stop: {
      ...NULL_STOP,
      stop_ref: "stop-1",
      title: "Museum",
      day_number: 2,
      day_date: "2026-11-03",
    },
    blockers: [],
  };
}

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return QueryWrapper;
}

describe("useOnTripMutations cache behavior", () => {
  beforeEach(async () => {
    jest.useRealTimers();
    mockedPostStopStatus.mockReset();
    mockedGetTripOnTripSnapshot.mockReset();
    await AsyncStorage.clear();
  });

  it("after Done, cache no longer reopens with planned status even before refresh completes", async () => {
    const snapshot = buildSnapshot();
    await writeOnTripSnapshotCache(101, snapshot);
    mockedPostStopStatus.mockResolvedValue({
      id: 1,
      kind: "stop_status",
      stop_ref: "stop-1",
      status: "confirmed",
      day_date: "2026-11-03",
      time: "10:00",
      title: "Museum",
      location: null,
      notes: null,
      created_by_user_id: 7,
      created_at: "2026-11-03T08:10:00Z",
    });
    mockedGetTripOnTripSnapshot.mockImplementation(
      () => new Promise<TripOnTripSnapshot>(() => {}),
    );

    const { result, unmount } = renderHook(
      () =>
        useOnTripMutations({
          tripId: 101,
          snapshot,
          onSnapshotRefresh: jest.fn(),
          currentUser: { id: 7, email: "david@example.com", display_name: "David" },
        }),
      { wrapper: buildWrapper() },
    );

    act(() => {
      void result.current.setStopStatus("stop-1", "confirmed");
    });

    await waitFor(async () => {
      const cached = await readOnTripSnapshotCache(101);
      expect(cached?.snapshot.today_stops[0]?.execution_status).toBe("confirmed");
    });

    unmount();
  });

  it("after Skip, cache no longer reopens with planned status even before refresh completes", async () => {
    const snapshot = buildSnapshot();
    await writeOnTripSnapshotCache(102, snapshot);
    mockedPostStopStatus.mockResolvedValue({
      id: 2,
      kind: "stop_status",
      stop_ref: "stop-1",
      status: "skipped",
      day_date: "2026-11-03",
      time: "10:00",
      title: "Museum",
      location: null,
      notes: null,
      created_by_user_id: 7,
      created_at: "2026-11-03T08:12:00Z",
    });
    mockedGetTripOnTripSnapshot.mockImplementation(
      () => new Promise<TripOnTripSnapshot>(() => {}),
    );

    const { result, unmount } = renderHook(
      () =>
        useOnTripMutations({
          tripId: 102,
          snapshot,
          onSnapshotRefresh: jest.fn(),
          currentUser: { id: 7, email: "david@example.com", display_name: "David" },
        }),
      { wrapper: buildWrapper() },
    );

    act(() => {
      void result.current.setStopStatus("stop-1", "skipped");
    });

    await waitFor(async () => {
      const cached = await readOnTripSnapshotCache(102);
      expect(cached?.snapshot.today_stops[0]?.execution_status).toBe("skipped");
    });

    unmount();
  });

  it("failed mutation does not write false Done/Skip status into cache", async () => {
    const snapshot = buildSnapshot();
    await writeOnTripSnapshotCache(103, snapshot);
    mockedPostStopStatus.mockRejectedValue(new Error("offline"));

    const { result, unmount } = renderHook(
      () =>
        useOnTripMutations({
          tripId: 103,
          snapshot,
          onSnapshotRefresh: jest.fn(),
          currentUser: { id: 7, email: "david@example.com", display_name: "David" },
        }),
      { wrapper: buildWrapper() },
    );

    await act(async () => {
      await result.current.setStopStatus("stop-1", "confirmed");
    });

    const cached = await readOnTripSnapshotCache(103);
    expect(cached?.snapshot.today_stops[0]?.execution_status).toBeNull();

    unmount();
  });
});

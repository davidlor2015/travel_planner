// Path: ui-mobile/__tests__/workspace/useWorkspaceOverviewModelApplyMoment.test.tsx
// Summary: Tests for the apply-itinerary handoff moment in useWorkspaceOverviewModel.

/**
 * Tests for the apply-itinerary handoff moment.
 *
 * These tests verify that after a user applies an itinerary:
 *  1. `recentlyApplied` flips to true (drives the confirmation banner)
 *  2. The `onItineraryApplied` callback fires (so WorkspaceScreen can park
 *     the user on the Overview tab)
 *  3. Stream completion auto-apply triggers the same moment
 *  4. A failed save does NOT mark the moment as applied
 */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Itinerary } from "@/features/ai/api";
import type { StreamState } from "@/features/ai/useStreamingItinerary";
import { useWorkspaceOverviewModel } from "@/features/trips/workspace/useWorkspaceOverviewModel";
import type { TripWorkspaceViewModel } from "@/features/trips/workspace/adapters";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSaveItinerary = jest.fn<Promise<unknown>, [unknown]>();
let mockSavedItineraryData: Itinerary | null = null;

jest.mock("@/features/ai/hooks", () => {
  const actual = jest.requireActual("@/features/ai/hooks");
  return {
    ...actual,
    useApplyItineraryMutation: () => ({
      mutateAsync: mockSaveItinerary,
      isPending: false,
    }),
    useSavedItineraryQuery: () => ({
      data: mockSavedItineraryData,
      isLoading: false,
      isError: false,
      error: null,
    }),
  };
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function flushMicrotasks() {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeItinerary(): Itinerary {
  return {
    title: "Lisbon Long Weekend",
    summary: "Three days of pastel houses and slow lunches.",
    days: [
      {
        day_number: 1,
        date: "2026-05-01",
        day_title: "Arrival",
        items: [
          {
            id: null,
            time: "5:00 PM",
            title: "Hotel check-in",
            location: "Alfama",
            lat: null,
            lon: null,
            notes: null,
            cost_estimate: null,
          },
        ],
      },
    ],
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "ai",
    source_label: "AI",
    fallback_used: false,
  };
}

function makeTrip(): TripWorkspaceViewModel {
  return {
    id: 1,
    title: "Lisbon Long Weekend",
    destination: "Lisbon",
    dateRange: "May 1–3",
    durationDays: 3,
    status: "upcoming",
    statusLabel: "Upcoming",
    memberCount: 1,
    members: [{ email: "you@example.com" }],
    isOwner: true,
    canEdit: true,
    isReadOnly: false,
    currentUserRoleLabel: "Owner",
  };
}

function makeStreamState(itinerary: Itinerary | null, streaming = false): StreamState {
  return {
    text: itinerary ? "stream payload" : "",
    itinerary,
    error: null,
    streaming,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useWorkspaceOverviewModel — apply moment", () => {
  beforeEach(() => {
    mockSaveItinerary.mockReset();
    mockSavedItineraryData = null;
  });

  it("auto-apply on stream completion fires onItineraryApplied and flips recentlyApplied", async () => {
    const saveDeferred = createDeferred<unknown>();
    mockSaveItinerary.mockImplementation(() => saveDeferred.promise);
    const onItineraryApplied = jest.fn();
    const itinerary = makeItinerary();

    const { result } = renderHook(
      () =>
        useWorkspaceOverviewModel({
          trip: makeTrip(),
          summary: null,
          collaboration: null,
          onTripSnapshot: null,
          streamState: makeStreamState(itinerary, false),
          onCancelStream: jest.fn(),
          onItineraryApplied,
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockSaveItinerary).toHaveBeenCalled());
    await act(async () => {
      saveDeferred.resolve(undefined);
      await flushMicrotasks();
      await flushMicrotasks();
    });
    await waitFor(() => expect(result.current.recentlyApplied).toBe(true));
    expect(onItineraryApplied).toHaveBeenCalledTimes(1);

    // The mutation payload carried the streamed itinerary and the ai_stream source.
    expect(mockSaveItinerary).toHaveBeenCalledWith({
      tripId: 1,
      itinerary,
      source: "ai_stream",
    });
  });

  it("manual publish via handlePublishChanges fires the same moment when dirty", async () => {
    mockSaveItinerary.mockResolvedValue(undefined);
    mockSavedItineraryData = makeItinerary();
    const onItineraryApplied = jest.fn();

    const { result } = renderHook(
      () =>
        useWorkspaceOverviewModel({
          trip: makeTrip(),
          summary: null,
          collaboration: null,
          onTripSnapshot: null,
          streamState: undefined,
          onCancelStream: jest.fn(),
          onItineraryApplied,
        }),
      { wrapper },
    );

    // The hook syncs the editable copy from saved on first render.
    await waitFor(() =>
      expect(result.current.itinerary?.title).toBe("Lisbon Long Weekend"),
    );
    expect(result.current.recentlyApplied).toBe(false);
    expect(result.current.isItineraryDirty).toBe(false);

    // Mutate the editable copy so isDirty becomes true.
    act(() => {
      result.current.handleAddDay();
    });
    expect(result.current.isItineraryDirty).toBe(true);

    await act(async () => {
      await result.current.handlePublishChanges();
    });

    expect(result.current.recentlyApplied).toBe(true);
    expect(onItineraryApplied).toHaveBeenCalledTimes(1);
    expect(mockSaveItinerary).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "manual_edit", tripId: 1 }),
    );
  });

  it("does NOT mark the moment as applied when the save call fails", async () => {
    const saveDeferred = createDeferred<unknown>();
    mockSaveItinerary.mockImplementation(() => saveDeferred.promise);
    const onItineraryApplied = jest.fn();
    const itinerary = makeItinerary();

    const { result } = renderHook(
      () =>
        useWorkspaceOverviewModel({
          trip: makeTrip(),
          summary: null,
          collaboration: null,
          onTripSnapshot: null,
          streamState: makeStreamState(itinerary, false),
          onCancelStream: jest.fn(),
          onItineraryApplied,
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockSaveItinerary).toHaveBeenCalled());
    await act(async () => {
      saveDeferred.reject(new Error("network down"));
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(result.current.recentlyApplied).toBe(false);
    expect(onItineraryApplied).not.toHaveBeenCalled();
  });

  it("dismissRecentlyApplied clears the moment so the workspace settles", async () => {
    mockSaveItinerary.mockResolvedValue(undefined);
    mockSavedItineraryData = makeItinerary();

    const { result } = renderHook(
      () =>
        useWorkspaceOverviewModel({
          trip: makeTrip(),
          summary: null,
          collaboration: null,
          onTripSnapshot: null,
          streamState: undefined,
          onCancelStream: jest.fn(),
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.itinerary?.title).toBe("Lisbon Long Weekend"),
    );
    act(() => {
      result.current.handleAddDay();
    });
    await act(async () => {
      await result.current.handlePublishChanges();
    });
    expect(result.current.recentlyApplied).toBe(true);

    act(() => result.current.dismissRecentlyApplied());

    expect(result.current.recentlyApplied).toBe(false);
  });
});

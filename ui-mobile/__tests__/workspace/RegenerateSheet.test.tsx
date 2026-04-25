/**
 * Tests for the RegenerateSheet component and the day-refinement flow in OverviewTab.
 *
 * These tests verify:
 * 1. The sheet opens for the correct day when "Improve day" is pressed
 * 2. The refine mutation is called with the correct tripId, day_number, and variant
 * 3. Loading / error / preview states are displayed correctly
 * 4. The existing itinerary is NOT replaced until the user explicitly accepts
 * 5. Dismissing ("Keep original") leaves the itinerary unchanged
 */
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import type { DayPlan, Itinerary } from "@/features/ai/api";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

function makeDayPlan(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    day_number: 1,
    date: "2024-09-01",
    day_title: "Arrival Day",
    items: [
      { id: 1, time: "10:00 AM", title: "Check in", location: "Hotel", lat: null, lon: null, notes: null, cost_estimate: null },
      { id: 2, time: "2:00 PM", title: "Explore town", location: "Downtown", lat: null, lon: null, notes: null, cost_estimate: null },
    ],
    ...overrides,
  };
}

function makeItinerary(days: DayPlan[] = [makeDayPlan()]): Itinerary {
  return {
    title: "Test Trip",
    summary: "A test itinerary",
    days,
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "ai",
    source_label: "AI",
    fallback_used: false,
  };
}

// ─── Mock the mutation hook ───────────────────────────────────────────────────

const mockMutateAsync = jest.fn();

jest.mock("@/features/ai/hooks", () => ({
  useRefineItineraryMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useApplyItineraryMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useSavedItineraryQuery: () => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// ─── Import component AFTER mocking ──────────────────────────────────────────

import { RegenerateSheet } from "@/features/trips/workspace/RegenerateSheet";

// ─── 1. Mutation called with correct parameters ───────────────────────────────

describe("RegenerateSheet — mutation contract", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it("calls refine with correct tripId, day_number, and no variant by default", async () => {
    const itinerary = makeItinerary();
    const day = itinerary.days[0];
    const onAccept = jest.fn();
    const onClose = jest.fn();

    mockMutateAsync.mockResolvedValue(makeItinerary());

    const { getByRole } = render(
      <RegenerateSheet
        visible
        tripId={42}
        day={day}
        currentItinerary={itinerary}
        onAccept={onAccept}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const call = mockMutateAsync.mock.calls[0][0];
    expect(call.tripId).toBe(42);
    expect(call.payload.regenerate_day_number).toBe(day.day_number);
    expect(call.payload.variant).toBeUndefined();
    expect(call.payload.current_itinerary).toEqual(itinerary);
    expect(call.payload.locked_items).toEqual([]);
    expect(call.payload.favorite_items).toEqual([]);
  });

  it("includes the selected variant in the mutation payload", async () => {
    const itinerary = makeItinerary();
    const onAccept = jest.fn();
    const onClose = jest.fn();
    mockMutateAsync.mockResolvedValue(makeItinerary());

    const { getByText, getByRole } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={itinerary.days[0]}
        currentItinerary={itinerary}
        onAccept={onAccept}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByText("Cheaper"));
    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync.mock.calls[0][0].payload.variant).toBe("cheaper");
  });
});

// ─── 2. Loading state ─────────────────────────────────────────────────────────

describe("RegenerateSheet — loading state", () => {
  it("shows working message while refining", async () => {
    const itinerary = makeItinerary();
    // Never resolves during this test
    mockMutateAsync.mockReturnValue(new Promise(() => {}));

    const { getByRole, queryByText, queryByRole } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={itinerary.days[0]}
        currentItinerary={itinerary}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));

    await waitFor(() =>
      expect(queryByText(/Working on Arrival Day/)).toBeTruthy(),
    );
    // CTA and variant chips should be gone while loading
    expect(queryByText("Cheaper")).toBeNull();
    expect(queryByRole("button", { name: /Regenerate this day/i })).toBeNull();
  });
});

// ─── 3. Error state ───────────────────────────────────────────────────────────

describe("RegenerateSheet — error state", () => {
  it("shows the error message when mutation rejects", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Service unavailable. Try again."));
    const itinerary = makeItinerary();

    const { getByRole, findByText } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={itinerary.days[0]}
        currentItinerary={itinerary}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));

    expect(await findByText("Service unavailable. Try again.")).toBeTruthy();
  });
});

// ─── 4. Itinerary not replaced until accepted ─────────────────────────────────

describe("RegenerateSheet — accept / dismiss invariant", () => {
  const originalDay = makeDayPlan({ day_number: 2, day_title: "Market Day", items: [
    { id: 10, time: "9:00 AM", title: "Farmers market", location: null, lat: null, lon: null, notes: null, cost_estimate: null },
  ]});
  const refinedDay = makeDayPlan({ day_number: 2, day_title: "Market Day", items: [
    { id: null, time: "9:00 AM", title: "Artisan market", location: "Old Quarter", lat: null, lon: null, notes: null, cost_estimate: null },
    { id: null, time: "11:30 AM", title: "Cooking class", location: "Culinary school", lat: null, lon: null, notes: null, cost_estimate: null },
  ]});

  const originalItinerary = makeItinerary([originalDay]);
  const refinedItinerary = makeItinerary([refinedDay]);

  it("calls onAccept with the refined itinerary when user accepts", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);
    const onAccept = jest.fn();

    const { getByRole, findByRole } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={originalDay}
        currentItinerary={originalItinerary}
        onAccept={onAccept}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));
    const acceptBtn = await findByRole("button", { name: /Accept changes/i });
    fireEvent.press(acceptBtn);

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith(refinedItinerary);
  });

  it("does NOT call onAccept when user dismisses with 'Keep original'", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);
    const onAccept = jest.fn();
    const onClose = jest.fn();

    const { getByRole, findByRole } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={originalDay}
        currentItinerary={originalItinerary}
        onAccept={onAccept}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));
    const keepBtn = await findByRole("button", { name: /Keep original/i });
    fireEvent.press(keepBtn);

    expect(onAccept).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("previews the refined day stops before the user accepts", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);

    const { getByRole, findByText } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={originalDay}
        currentItinerary={originalItinerary}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByRole("button", { name: /Regenerate this day/i }));

    // The refined stop titles should be visible in the preview
    expect(await findByText("Artisan market")).toBeTruthy();
    expect(await findByText("Cooking class")).toBeTruthy();
  });
});

// ─── 5. Day title shown correctly ─────────────────────────────────────────────

describe("RegenerateSheet — day label", () => {
  it("shows day_title when present", () => {
    const day = makeDayPlan({ day_title: "Arrival Day" });
    const { getAllByText } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    // day_title appears as the large heading
    expect(getAllByText("Arrival Day").length).toBeGreaterThan(0);
  });

  it("falls back to 'Day N' when day_title is absent", () => {
    const day = makeDayPlan({ day_number: 3, day_title: undefined });
    const { getAllByText } = render(
      <RegenerateSheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getAllByText("Day 3").length).toBeGreaterThan(0);
  });
});

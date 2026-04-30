/**
 * Tests for the RethinkDaySheet component.
 *
 * Verifies:
 * 1. Sheet renders the note input
 * 2. Confirm button is disabled until a note is entered
 * 3. Submitting calls the day-level refine path with user_note and no variant
 * 4. Only the selected day is affected (other days untouched in preview itinerary)
 * 5. Error state keeps the original day (onAccept not called)
 * 6. Preview is shown before accept; onAccept fires on accept
 * 7. onAccept is not called when user dismisses with "Keep original"
 */
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { DayPlan, Itinerary } from "@/features/ai/api";
import { RethinkDaySheet } from "@/features/trips/workspace/RethinkDaySheet";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDay(overrides: Partial<DayPlan> = {}): DayPlan {
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

function makeItinerary(days: DayPlan[] = [makeDay()]): Itinerary {
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

// ─── Mutation mock ────────────────────────────────────────────────────────────

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

// ─── 1. Note input renders ────────────────────────────────────────────────────

describe("RethinkDaySheet — note input", () => {
  beforeEach(() => mockMutateAsync.mockReset());

  it("shows the note TextInput when idle", () => {
    const day = makeDay();
    const { getByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText("Note for rethinking this day")).toBeTruthy();
  });

  it("confirm button is disabled when note is empty", () => {
    const day = makeDay();
    const { getByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const btn = getByLabelText("Confirm rethink");
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });
});

// ─── 2. Mutation contract ─────────────────────────────────────────────────────

describe("RethinkDaySheet — mutation contract", () => {
  beforeEach(() => mockMutateAsync.mockReset());

  it("calls refine with user_note, correct tripId and day_number, and no variant", async () => {
    const itinerary = makeItinerary();
    const day = itinerary.days[0];
    mockMutateAsync.mockResolvedValue(makeItinerary());

    const { getByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={42}
        day={day}
        currentItinerary={itinerary}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "More food, less museums");
    fireEvent.press(getByLabelText("Confirm rethink"));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const call = mockMutateAsync.mock.calls[0][0];
    expect(call.tripId).toBe(42);
    expect(call.payload.regenerate_day_number).toBe(day.day_number);
    expect(call.payload.user_note).toBe("More food, less museums");
    expect(call.payload.variant).toBeUndefined();
    expect(call.payload.current_itinerary).toEqual(itinerary);
    expect(call.payload.locked_items).toEqual([]);
    expect(call.payload.favorite_items).toEqual([]);
  });
});

// ─── 3. Only the selected day changes ─────────────────────────────────────────

describe("RethinkDaySheet — only selected day changes", () => {
  beforeEach(() => mockMutateAsync.mockReset());

  it("passes the full itinerary in the request so other days are preserved", async () => {
    const day1 = makeDay({ day_number: 1, day_title: "Day one" });
    const day2 = makeDay({ day_number: 2, day_title: "Day two" });
    const itinerary = makeItinerary([day1, day2]);
    mockMutateAsync.mockResolvedValue(itinerary);

    const { getByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={day1}
        currentItinerary={itinerary}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "More relaxed");
    fireEvent.press(getByLabelText("Confirm rethink"));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const sentItinerary = mockMutateAsync.mock.calls[0][0].payload.current_itinerary;
    expect(sentItinerary.days).toHaveLength(2);
    expect(sentItinerary.days[1].day_title).toBe("Day two");
  });
});

// ─── 4. Error state keeps original ───────────────────────────────────────────

describe("RethinkDaySheet — error state", () => {
  beforeEach(() => mockMutateAsync.mockReset());

  it("shows error copy and does not call onAccept when mutation fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Service down"));
    const day = makeDay();
    const onAccept = jest.fn();

    const { getByLabelText, findByText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={onAccept}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "Any note");
    fireEvent.press(getByLabelText("Confirm rethink"));

    expect(
      await findByText("Couldn't update this day. Your original plan is still here."),
    ).toBeTruthy();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

// ─── 5. Preview and accept ────────────────────────────────────────────────────

describe("RethinkDaySheet — preview and accept", () => {
  const original = makeDay({
    day_number: 1,
    items: [{ id: 1, time: "9:00 AM", title: "Old stop", location: null, lat: null, lon: null, notes: null, cost_estimate: null }],
  });
  const refined = makeDay({
    day_number: 1,
    items: [{ id: null, time: "10:00 AM", title: "New stop", location: "Beach", lat: null, lon: null, notes: null, cost_estimate: null }],
  });
  const refinedItinerary = makeItinerary([refined]);

  beforeEach(() => mockMutateAsync.mockReset());

  it("shows preview stop titles after successful mutation", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);

    const { getByLabelText, findByText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={original}
        currentItinerary={makeItinerary([original])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "Any note");
    fireEvent.press(getByLabelText("Confirm rethink"));

    expect(await findByText("New stop")).toBeTruthy();
  });

  it("calls onAccept with refined itinerary when user accepts", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);
    const onAccept = jest.fn();

    const { getByLabelText, findByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={original}
        currentItinerary={makeItinerary([original])}
        onAccept={onAccept}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "Any note");
    fireEvent.press(getByLabelText("Confirm rethink"));

    const acceptBtn = await findByLabelText("Accept changes");
    fireEvent.press(acceptBtn);

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith(refinedItinerary);
  });

  it("does not call onAccept when user keeps original", async () => {
    mockMutateAsync.mockResolvedValue(refinedItinerary);
    const onAccept = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText, findByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={original}
        currentItinerary={makeItinerary([original])}
        onAccept={onAccept}
        onClose={onClose}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "Any note");
    fireEvent.press(getByLabelText("Confirm rethink"));

    const keepBtn = await findByLabelText("Keep original");
    fireEvent.press(keepBtn);

    expect(onAccept).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. Loading state ─────────────────────────────────────────────────────────

describe("RethinkDaySheet — loading state", () => {
  beforeEach(() => mockMutateAsync.mockReset());

  it("shows rethinking message while mutation is in flight", async () => {
    mockMutateAsync.mockReturnValue(new Promise(() => {}));
    const day = makeDay();

    const { getByLabelText, queryByText, queryByLabelText } = render(
      <RethinkDaySheet
        visible
        tripId={1}
        day={day}
        currentItinerary={makeItinerary([day])}
        onAccept={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByLabelText("Note for rethinking this day"), "Something");
    fireEvent.press(getByLabelText("Confirm rethink"));

    await waitFor(() =>
      expect(queryByText(/Rethinking this day/)).toBeTruthy(),
    );
    // Input hidden while rethinking
    expect(queryByLabelText("Note for rethinking this day")).toBeNull();
  });
});

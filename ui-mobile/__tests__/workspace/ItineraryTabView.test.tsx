// Path: ui-mobile/__tests__/workspace/ItineraryTabView.test.tsx
// Summary: Covers automated tests for ItineraryTabView.test behavior.

import { fireEvent, render, within } from "@testing-library/react-native";
import { useState } from "react";

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import { ItineraryTabView } from "@/features/trips/workspace/ItineraryTabView";
import { StopFormSheet } from "@/features/trips/workspace/StopFormSheet";
import {
  addDayToItinerary,
  buildDayOptions,
  buildTimeOptions,
  getStopMoveAvailability,
} from "@/features/trips/workspace/itineraryDraftMutations";
import { buildItineraryTabDays } from "@/features/trips/workspace/itineraryPresentation";

jest.mock("@expo/vector-icons", () => {
  return {
    Ionicons: () => null,
  };
});

function stop(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: overrides.id ?? null,
    time: overrides.time ?? null,
    title: overrides.title ?? "Stop",
    location: overrides.location ?? null,
    lat: overrides.lat ?? null,
    lon: overrides.lon ?? null,
    notes: overrides.notes ?? null,
    cost_estimate: overrides.cost_estimate ?? null,
    status: overrides.status ?? "planned",
    handled_by: overrides.handled_by ?? null,
    booked_by: overrides.booked_by ?? null,
  };
}

function day(day_number: number, items: ItineraryItem[]): DayPlan {
  return {
    day_number,
    date: `2026-04-${String(20 + day_number).padStart(2, "0")}`,
    day_title: `Day ${day_number}`,
    day_note: null,
    anchors: [],
    items,
  };
}

function itinerary(days: DayPlan[]): Itinerary {
  return {
    title: "Trip",
    summary: "Summary",
    days,
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "saved_itinerary",
    source_label: "Saved itinerary",
    fallback_used: false,
  };
}

function renderView(days: DayPlan[]) {
  const current = itinerary(days);
  return render(
    <ItineraryTabView
      days={buildItineraryTabDays(current, "all")}
      allDayCount={current.days.length}
      filter="all"
      onFilterChange={jest.fn()}
      isLoading={false}
      isMissing={false}
      isStreaming={false}
      isDirty={false}
      isSaving={false}
      streamText={null}
      error={null}
      onAddStop={jest.fn()}
      onEditStop={jest.fn()}
      onAddDay={jest.fn()}
      onPublish={jest.fn()}
      onRegenerateAll={jest.fn()}
      onCancelStream={jest.fn()}
    />,
  );
}

function StatefulItineraryHarness({
  initialDays,
  onAddDay = jest.fn(),
}: {
  initialDays: DayPlan[];
  onAddDay?: () => void;
}) {
  const [current, setCurrent] = useState(() => itinerary(initialDays));

  return (
    <ItineraryTabView
      days={buildItineraryTabDays(current, "all")}
      allDayCount={current.days.length}
      filter="all"
      onFilterChange={jest.fn()}
      isLoading={false}
      isMissing={false}
      isStreaming={false}
      isDirty={false}
      isSaving={false}
      streamText={null}
      error={null}
      onAddStop={jest.fn()}
      onEditStop={jest.fn()}
      onAddDay={() => {
        onAddDay();
        setCurrent((value) => addDayToItinerary(value));
      }}
      onPublish={jest.fn()}
      onRegenerateAll={jest.fn()}
      onCancelStream={jest.fn()}
    />
  );
}

function AddStopSheetHarness() {
  const [current] = useState(() =>
    itinerary([
      day(1, [stop({ title: "Museum" })]),
      day(2, []),
    ]),
  );
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const selectedSource = editingDayIndex === null ? null : { dayIndex: editingDayIndex, stopIndex: 0 };

  return (
    <>
      <ItineraryTabView
        days={buildItineraryTabDays(current, "all")}
        allDayCount={current.days.length}
        filter="all"
        onFilterChange={jest.fn()}
        isLoading={false}
        isMissing={false}
        isStreaming={false}
        isDirty={false}
        isSaving={false}
        streamText={null}
        error={null}
        onAddStop={(dayIndex) => setEditingDayIndex(dayIndex)}
        onEditStop={jest.fn()}
        onAddDay={jest.fn()}
        onPublish={jest.fn()}
        onRegenerateAll={jest.fn()}
        onCancelStream={jest.fn()}
      />
      <StopFormSheet
        visible={editingDayIndex !== null}
        item={null}
        initialDayIndex={editingDayIndex ?? 0}
        dayOptions={buildDayOptions(current.days)}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={getStopMoveAvailability(current, selectedSource)}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={() => setEditingDayIndex(null)}
      />
    </>
  );
}

describe("ItineraryTabView day controls", () => {
  it("adds an initial day from the header add action when the itinerary is empty", () => {
    const onAddDay = jest.fn();
    const { getByLabelText, getByText } = render(
      <StatefulItineraryHarness
        initialDays={[]}
        onAddDay={onAddDay}
      />,
    );

    fireEvent.press(getByLabelText("Add itinerary day"));

    expect(onAddDay).toHaveBeenCalledTimes(1);
    expect(getByText("Day 1")).toBeTruthy();
  });

  it("does not render dense per-day add or remove actions", () => {
    const { queryByLabelText } = renderView([
      day(1, [stop({ title: "Museum" })]),
    ]);

    expect(queryByLabelText("Add stop to Day 1")).toBeNull();
    expect(queryByLabelText("Remove Day 1")).toBeNull();
  });

  it("opens add-stop from the header add action with the first visible day preselected", () => {
    const { getByLabelText, getByPlaceholderText } = render(<AddStopSheetHarness />);

    fireEvent.press(getByLabelText("Add itinerary stop"));

    expect(getByPlaceholderText("Stop title")).toBeTruthy();
    expect(
      within(getByLabelText("Choose itinerary day")).getByText("Day 1 · Apr 21 · Tue"),
    ).toBeTruthy();
  });
});

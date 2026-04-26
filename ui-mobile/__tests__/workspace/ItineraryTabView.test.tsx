import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import { ItineraryTabView } from "@/features/trips/workspace/ItineraryTabView";
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
      onDeleteDay={jest.fn()}
      onPublish={jest.fn()}
      onRegenerateAll={jest.fn()}
      onCancelStream={jest.fn()}
    />,
  );
}

describe("ItineraryTabView day controls", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("warns clearly before removing a day with stops", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();
    const { getByLabelText } = renderView([
      day(1, [stop({ title: "Museum" }), stop({ title: "Dinner" })]),
      day(2, []),
    ]);

    fireEvent.press(getByLabelText("Remove Day 1"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remove Day 1?",
      "This removes the day and deletes 2 stops from your local draft.",
      expect.any(Array),
    );
  });

  it("blocks removing the only remaining day", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();
    const { getByLabelText } = renderView([day(1, [])]);

    fireEvent.press(getByLabelText("Remove Day 1"));

    expect(alertSpy).not.toHaveBeenCalled();
  });
});

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import {
  addDayToItinerary,
  addStopToDay,
  buildDayOptions,
  buildTimeOptions,
  deleteDayFromItinerary,
  deleteStopFromItinerary,
  getStopMoveAvailability,
  moveStopToDay,
  moveStopWithinDay,
  updateStopInItinerary,
} from "@/features/trips/workspace/itineraryDraftMutations";

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

function day(day_number: number, items: ItineraryItem[], date: string | null = null): DayPlan {
  return {
    day_number,
    date,
    day_title: `Day ${day_number}`,
    day_note: null,
    anchors: [],
    items,
  };
}

function itinerary(): Itinerary {
  return {
    title: "Trip",
    summary: "Summary",
    days: [
      day(1, [stop({ id: 1, title: "A", time: "8:00 AM" }), stop({ id: 2, title: "B" })], "2026-04-21"),
      day(2, [stop({ id: 3, title: "C" })], "2026-04-22"),
    ],
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "saved_itinerary",
    source_label: "Saved itinerary",
    fallback_used: false,
  };
}

function itineraryWithDays(count: number): Itinerary {
  return {
    ...itinerary(),
    days: Array.from({ length: count }, (_value, index) =>
      day(
        index + 1,
        [stop({ id: index + 1, title: `Stop ${index + 1}` })],
        `2026-04-${String(21 + index).padStart(2, "0")}`,
      ),
    ),
  };
}

describe("itineraryDraftMutations", () => {
  it("builds 30-minute trip-local time options with No time", () => {
    const options = buildTimeOptions(30);

    expect(options[0]).toEqual({ label: "No time", value: null });
    expect(options[1]).toEqual({ label: "12:00 AM", value: "12:00 AM" });
    expect(options[13]).toEqual({ label: "6:00 AM", value: "6:00 AM" });
    expect(options[14]).toEqual({ label: "6:30 AM", value: "6:30 AM" });
    expect(options[options.length - 1]).toEqual({ label: "11:30 PM", value: "11:30 PM" });
    expect(options).toHaveLength(49);
  });

  it("builds day selector labels from real itinerary days", () => {
    const options = buildDayOptions(itinerary().days);

    expect(options[0].label).toMatch(/^Day 1 · Apr 21 · Tue$/);
    expect(options[1].label).toMatch(/^Day 2 · Apr 22 · Wed$/);
  });

  it("adds a stop to the selected day without mutating the original itinerary", () => {
    const original = itinerary();
    const added = stop({ id: null, title: "Day 2 dinner", time: "7:30 PM" });
    const next = addStopToDay(original, 1, added);

    expect(next.days[1].items.map((item) => item.title)).toEqual(["C", "Day 2 dinner"]);
    expect(original.days[1].items.map((item) => item.title)).toEqual(["C"]);
  });

  it("adds an empty itinerary day after the current last day", () => {
    const original = itinerary();
    const next = addDayToItinerary(original);

    expect(next.days).toHaveLength(3);
    expect(next.days[2]).toMatchObject({
      day_number: 3,
      date: "2026-04-23",
      day_title: "Day 3",
      items: [],
    });
    expect(original.days).toHaveLength(2);
  });

  it("can add a stop to a newly added last day", () => {
    const withNewDay = addDayToItinerary(itinerary());
    const lastDayIndex = withNewDay.days.length - 1;
    const next = addStopToDay(
      withNewDay,
      lastDayIndex,
      stop({ title: "New day lunch", time: "12:30 PM" }),
    );

    expect(next.days[lastDayIndex].day_number).toBe(3);
    expect(next.days[lastDayIndex].items).toHaveLength(1);
    expect(next.days[lastDayIndex].items[0]).toMatchObject({
      title: "New day lunch",
      time: "12:30 PM",
    });
  });

  it("removes a day and renumbers generic day titles", () => {
    const original = itinerary();
    const next = deleteDayFromItinerary(original, 0);

    expect(next.days).toHaveLength(1);
    expect(next.days[0]).toMatchObject({
      day_number: 1,
      day_title: "Day 1",
      date: "2026-04-22",
    });
    expect(next.days[0].items.map((item) => item.title)).toEqual(["C"]);
    expect(original.days[0].day_number).toBe(1);
  });

  it("does not remove the only remaining itinerary day", () => {
    const original = {
      ...itinerary(),
      days: [day(1, [], "2026-04-21")],
    };
    const next = deleteDayFromItinerary(original, 0);

    expect(next).toBe(original);
    expect(next.days).toHaveLength(1);
  });

  it("removes Day 2 from a 4-day itinerary and renumbers following days", () => {
    const original = itineraryWithDays(4);
    const next = deleteDayFromItinerary(original, 1);

    expect(next.days.map((current) => current.day_number)).toEqual([1, 2, 3]);
    expect(next.days.map((current) => current.day_title)).toEqual(["Day 1", "Day 2", "Day 3"]);
    expect(next.days.map((current) => current.items[0]?.title)).toEqual([
      "Stop 1",
      "Stop 3",
      "Stop 4",
    ]);
  });

  it("keeps date labels tied to the remaining calendar dates after renumbering", () => {
    const next = deleteDayFromItinerary(itineraryWithDays(4), 1);
    const options = buildDayOptions(next.days);

    expect(options.map((option) => option.label)).toEqual([
      "Day 1 · Apr 21 · Tue",
      "Day 2 · Apr 23 · Thu",
      "Day 3 · Apr 24 · Fri",
    ]);
  });

  it("updates a stop and preserves its id and metadata", () => {
    const original = itinerary();
    const next = updateStopInItinerary(original, { dayIndex: 0, stopIndex: 0 }, {
      title: "Updated A",
      location: "Museum",
      time: "8:30 AM",
    });

    expect(next.days[0].items[0]).toMatchObject({
      id: 1,
      title: "Updated A",
      location: "Museum",
      time: "8:30 AM",
      status: "planned",
    });
  });

  it("moves a stop to another day when the selected day changes", () => {
    const original = itinerary();
    const next = updateStopInItinerary(
      original,
      { dayIndex: 0, stopIndex: 1 },
      { title: "Moved B" },
      1,
    );

    expect(next.days[0].items.map((item) => item.title)).toEqual(["A"]);
    expect(next.days[1].items.map((item) => item.title)).toEqual(["C", "Moved B"]);
    expect(next.days[1].items[1].id).toBe(2);
  });

  it("moves stops up and down within a day", () => {
    const original = itinerary();
    const movedUp = moveStopWithinDay(original, { dayIndex: 0, stopIndex: 1 }, "up");
    const movedDown = moveStopWithinDay(movedUp, { dayIndex: 0, stopIndex: 0 }, "down");

    expect(movedUp.days[0].items.map((item) => item.title)).toEqual(["B", "A"]);
    expect(movedDown.days[0].items.map((item) => item.title)).toEqual(["A", "B"]);
  });

  it("moves a stop to a previous or next day by appending to the target day", () => {
    const original = itinerary();
    const nextDay = moveStopToDay(original, { dayIndex: 0, stopIndex: 0 }, 1);
    const previousDay = moveStopToDay(nextDay, { dayIndex: 1, stopIndex: 1 }, 0);

    expect(nextDay.days[0].items.map((item) => item.title)).toEqual(["B"]);
    expect(nextDay.days[1].items.map((item) => item.title)).toEqual(["C", "A"]);
    expect(previousDay.days[0].items.map((item) => item.title)).toEqual(["B", "A"]);
  });

  it("deletes a stop", () => {
    const next = deleteStopFromItinerary(itinerary(), { dayIndex: 0, stopIndex: 0 });

    expect(next.days[0].items.map((item) => item.title)).toEqual(["B"]);
  });

  it("reports disabled move actions at day and row boundaries", () => {
    const original = itinerary();

    expect(getStopMoveAvailability(original, { dayIndex: 0, stopIndex: 0 })).toEqual({
      canMoveUp: false,
      canMoveDown: true,
      canMoveToPreviousDay: false,
      canMoveToNextDay: true,
    });
    expect(getStopMoveAvailability(original, { dayIndex: 1, stopIndex: 0 })).toEqual({
      canMoveUp: false,
      canMoveDown: false,
      canMoveToPreviousDay: true,
      canMoveToNextDay: false,
    });
  });
});

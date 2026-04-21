import { describe, expect, it } from "vitest";

import { createItineraryDraftMutations } from "./itineraryDraftMutations";
import type { EditableItinerary, EditableItineraryItem } from "../itineraryDraft";

function makeStop(id: string, title: string): EditableItineraryItem {
  return {
    client_id: id,
    time: null,
    title,
    location: null,
    lat: null,
    lon: null,
    notes: null,
    cost_estimate: null,
    status: "planned",
  };
}

function makeDraft(): EditableItinerary {
  return {
    title: "Trip Draft",
    summary: "",
    source: "manual",
    source_label: "Manual",
    fallback_used: false,
    budget_breakdown: null,
    packing_list: [],
    tips: [],
    days: [
      {
        day_number: 1,
        date: "2026-06-01",
        day_title: null,
        day_note: null,
        items: [makeStop("a", "Museum"), makeStop("b", "Lunch")],
      },
    ],
  };
}

function createStateHarness(initial: Record<number, EditableItinerary>) {
  let state = initial;
  const setState = (
    updater:
      | Record<number, EditableItinerary>
      | ((prev: Record<number, EditableItinerary>) => Record<number, EditableItinerary>),
  ) => {
    state = typeof updater === "function" ? updater(state) : updater;
  };
  return {
    setState,
    getState: () => state,
  };
}

describe("itineraryDraftMutations", () => {
  it("adds, updates, and deletes stops within a day", () => {
    const harness = createStateHarness({ 7: makeDraft() });
    const mutations = createItineraryDraftMutations(harness.setState);

    mutations.addStop(7, 1);
    let current = harness.getState()[7];
    expect(current.days[0].items).toHaveLength(3);

    const added = current.days[0].items[2];
    mutations.updateStop(7, 1, added.client_id, { title: "Dinner" });
    current = harness.getState()[7];
    expect(current.days[0].items[2]?.title).toBe("Dinner");

    mutations.deleteStop(7, 1, added.client_id);
    current = harness.getState()[7];
    expect(current.days[0].items.map((item) => item.title)).toEqual([
      "Museum",
      "Lunch",
    ]);
  });

  it("reorders stops within a day deterministically", () => {
    const harness = createStateHarness({ 9: makeDraft() });
    const mutations = createItineraryDraftMutations(harness.setState);

    mutations.reorderStopsWithinDay(9, 1, 0, 1);
    const current = harness.getState()[9];

    expect(current.days[0].items.map((item) => item.title)).toEqual([
      "Lunch",
      "Museum",
    ]);
  });

  it("updates lightweight stop status in overview draft flow", () => {
    const harness = createStateHarness({ 11: makeDraft() });
    const mutations = createItineraryDraftMutations(harness.setState);

    mutations.updateStop(11, 1, "a", { status: "confirmed" });
    mutations.updateStop(11, 1, "b", { status: "skipped" });

    const current = harness.getState()[11];
    expect(current.days[0].items.map((item) => item.status)).toEqual([
      "confirmed",
      "skipped",
    ]);
  });
});

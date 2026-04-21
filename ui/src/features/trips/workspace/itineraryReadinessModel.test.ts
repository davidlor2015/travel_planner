import { describe, expect, it } from "vitest";

import type { EditableItinerary } from "../itineraryDraft";
import { buildItineraryReadinessSnapshot } from "./itineraryReadinessModel";

function itineraryBase(): EditableItinerary {
  return {
    title: "Draft",
    summary: "Draft",
    source: "manual",
    source_label: "Manual",
    fallback_used: false,
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    days: [
      {
        day_number: 1,
        date: "2026-06-01",
        day_title: null,
        day_note: null,
        day_anchors: [],
        items: [],
      },
    ],
  };
}

describe("itineraryReadinessModel", () => {
  it("treats timed operational anchors as first-day timing coverage", () => {
    const itinerary: EditableItinerary = {
      ...itineraryBase(),
      days: [
        {
          ...itineraryBase().days[0],
          day_anchors: [
            {
              id: "a1",
              type: "flight",
              label: "UA 1",
              time: "08:30",
              note: null,
              handled_by: null,
              booked_by: null,
            },
          ],
        },
      ],
    };

    const snapshot = buildItineraryReadinessSnapshot(itinerary);
    expect(snapshot.dayIndicators[1]).toBeUndefined();
  });

  it("surfaces unassigned operational anchors only when ownership signals are in use", () => {
    const itinerary: EditableItinerary = {
      ...itineraryBase(),
      days: [
        {
          ...itineraryBase().days[0],
          day_anchors: [
            {
              id: "a1",
              type: "flight",
              label: "UA 1",
              time: null,
              note: null,
              handled_by: "owner@example.com",
              booked_by: null,
            },
            {
              id: "a2",
              type: "hotel_checkin",
              label: "Hotel",
              time: "15:00",
              note: null,
              handled_by: null,
              booked_by: null,
            },
          ],
          items: [],
        },
      ],
    };

    const snapshot = buildItineraryReadinessSnapshot(itinerary, {
      groupTrip: true,
    });
    expect(snapshot.dayIndicators[1]?.label).toBe("Anchor needs handler");
  });
});

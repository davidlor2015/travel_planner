import { render } from "@testing-library/react-native";

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import { OverviewItineraryPreviewRow } from "@/features/trips/workspace/OverviewTab";
import {
  buildOverviewItineraryDayPreviews,
  type OverviewItineraryDayPreview,
} from "@/features/trips/workspace/overviewItineraryPreview";

function stop(title: string): ItineraryItem {
  return {
    id: null,
    time: null,
    title,
    location: null,
    lat: null,
    lon: null,
    notes: null,
    cost_estimate: null,
    status: "planned",
    handled_by: null,
    booked_by: null,
  };
}

function day(dayNumber: number): DayPlan {
  return {
    day_number: dayNumber,
    date: `2026-04-${String(20 + dayNumber).padStart(2, "0")}`,
    day_title: `Day ${dayNumber}`,
    day_note: null,
    anchors: [],
    items: [stop(`Stop ${dayNumber}`)],
  };
}

function itinerary(dayCount: number): Itinerary {
  return {
    title: "Trip",
    summary: "Summary",
    days: Array.from({ length: dayCount }, (_, index) => day(index + 1)),
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "saved_itinerary",
    source_label: "Saved itinerary",
    fallback_used: false,
  };
}

function labels(previews: OverviewItineraryDayPreview[]): string[] {
  return previews.map((preview) => preview.dayTitle);
}

describe("buildOverviewItineraryDayPreviews", () => {
  it("shows Day 4, Day 5, and Day 6 for a 6-day trip when current day is Day 4", () => {
    expect(
      labels(
        buildOverviewItineraryDayPreviews(itinerary(6), {
          currentDayNumber: 4,
        }),
      ),
    ).toEqual(["Day 4", "Day 5", "Day 6"]);
  });

  it("shows Day 1, Day 2, and Day 3 when current day is Day 1", () => {
    expect(
      labels(
        buildOverviewItineraryDayPreviews(itinerary(6), {
          currentDayNumber: 1,
        }),
      ),
    ).toEqual(["Day 1", "Day 2", "Day 3"]);
  });

  it("backfills previous days when current day is the final day", () => {
    expect(
      labels(
        buildOverviewItineraryDayPreviews(itinerary(6), {
          currentDayNumber: 6,
        }),
      ),
    ).toEqual(["Day 4", "Day 5", "Day 6"]);
  });

  it("shows all available days for a 2-day trip", () => {
    expect(
      labels(
        buildOverviewItineraryDayPreviews(itinerary(2), {
          currentDayNumber: 2,
        }),
      ),
    ).toEqual(["Day 1", "Day 2"]);
  });

  it("falls back to the first three days when no current day is available", () => {
    expect(labels(buildOverviewItineraryDayPreviews(itinerary(6)))).toEqual([
      "Day 1",
      "Day 2",
      "Day 3",
    ]);
  });
});

describe("OverviewItineraryPreviewRow", () => {
  it("does not render a standalone left numeric column", () => {
    const [preview] = buildOverviewItineraryDayPreviews(itinerary(1));
    const { getByText, queryByText } = render(
      <OverviewItineraryPreviewRow
        preview={preview!}
        showBorder={false}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("Day 1")).toBeTruthy();
    expect(queryByText("1")).toBeNull();
  });
});

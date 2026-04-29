import { render } from "@testing-library/react-native";

import type { Itinerary, ItineraryItem } from "@/features/ai/api";
import { ItineraryTimelineDay } from "@/features/trips/workspace/ItineraryTimelineDay";
import { buildItineraryTabDays } from "@/features/trips/workspace/itineraryPresentation";

function stop(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: overrides.id ?? 1,
    time: overrides.time ?? "12:30 PM",
    title: overrides.title ?? "Stop",
    location: overrides.location ?? "Rome",
    lat: overrides.lat ?? null,
    lon: overrides.lon ?? null,
    notes: overrides.notes ?? null,
    cost_estimate: overrides.cost_estimate ?? null,
    status: overrides.status ?? "planned",
    handled_by: overrides.handled_by ?? null,
    booked_by: overrides.booked_by ?? null,
  };
}

describe("ItineraryTimelineDay", () => {
  it("renders the full stop time beside a long stop title", () => {
    const itinerary: Itinerary = {
      title: "Rome",
      summary: "A day in Rome",
      days: [
        {
          day_number: 1,
          date: "2026-07-10",
          day_title: "Arrival",
          items: [
            stop({
              time: "12:30PM",
              title:
                "A very long stop title that should wrap before the time column gets squeezed",
            }),
          ],
        },
      ],
      budget_breakdown: null,
      packing_list: null,
      tips: null,
      source: "manual",
      source_label: "Manual",
      fallback_used: false,
    };

    const day = buildItineraryTabDays(itinerary, "all")[0]!;
    const { getByText } = render(
      <ItineraryTimelineDay day={day} onEditStop={jest.fn()} />,
    );

    expect(getByText("12:30 PM")).toBeTruthy();
    expect(
      getByText(
        "A very long stop title that should wrap before the time column gets squeezed",
      ),
    ).toBeTruthy();
  });
});

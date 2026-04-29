import { render } from "@testing-library/react-native";

import { TimelineRow } from "@/features/trips/onTrip/TimelineRow";
import type { StopVM } from "@/features/trips/onTrip/adapters";

function stop(overrides: Partial<StopVM> = {}): StopVM {
  return {
    key: "stop-1",
    day_number: 1,
    day_date: "2026-10-10",
    title: "Museum",
    time: "10:00",
    location: "Kyoto",
    notes: null,
    lat: null,
    lon: null,
    status: "planned",
    source: "day_date_exact",
    confidence: "high",
    stop_ref: "stop-1",
    execution_status: "confirmed",
    effectiveStatus: "confirmed",
    isPending: false,
    isReadOnly: false,
    status_updated_by_user_id: 7,
    status_updated_by_display_name: "David",
    status_updated_by_email: "david@example.com",
    status_updated_at: "2026-10-10T10:04:00Z",
    statusUpdatedByUserId: 7,
    statusUpdatedByName: "David",
    statusUpdatedAt: "2026-10-10T10:04:00Z",
    statusActionLabel: "Confirmed by David",
    statusActionDetailLabel: "Confirmed by David · 2m ago",
    ...overrides,
  };
}

describe("TimelineRow actor metadata", () => {
  it("shows compact actor text for resolved stops", () => {
    const { getByText } = render(
      <TimelineRow
        stop={stop()}
        variant="done"
        isLast
        onPress={jest.fn()}
      />,
    );

    expect(getByText("Confirmed by David")).toBeTruthy();
  });
});

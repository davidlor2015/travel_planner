import { toArchiveTripViewModel } from "@/features/trips/archive/archiveUtils";
import type { TripExecutionSummary, TripResponse } from "@/features/trips/types";

function makeTrip(overrides: Partial<TripResponse> = {}): TripResponse {
  return {
    id: overrides.id ?? 7,
    title: overrides.title ?? "Lisbon Escape",
    destination: overrides.destination ?? "Lisbon, Portugal",
    description: overrides.description ?? null,
    start_date: overrides.start_date ?? "2026-03-01",
    end_date: overrides.end_date ?? "2026-03-05",
    notes: overrides.notes ?? null,
    user_id: overrides.user_id ?? 1,
    created_at: overrides.created_at ?? "2026-02-10T10:00:00Z",
    member_count: overrides.member_count ?? 2,
    members: overrides.members ?? [],
    pending_invites: overrides.pending_invites ?? [],
  };
}

describe("toArchiveTripViewModel", () => {
  it("maps execution summary counts for archive memories", () => {
    const summary: TripExecutionSummary = {
      confirmed_stops_count: 8,
      skipped_stops_count: 3,
      unplanned_stops_count: 2,
    };

    const vm = toArchiveTripViewModel(makeTrip(), undefined, summary);

    expect(vm.executionSummary).toEqual({
      confirmedStopsCount: 8,
      skippedStopsCount: 3,
      unplannedStopsCount: 2,
    });
  });

  it("keeps execution summary null when unavailable", () => {
    const vm = toArchiveTripViewModel(makeTrip(), undefined, null);

    expect(vm.executionSummary).toBeNull();
  });
});

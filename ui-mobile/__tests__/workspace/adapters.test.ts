import { toTripWorkspaceViewModel } from "@/features/trips/workspace/adapters";
import type { TripResponse } from "@/features/trips/types";

function buildTrip(overrides: Partial<TripResponse> = {}): TripResponse {
  return {
    id: overrides.id ?? 12,
    title: overrides.title ?? "Lake Weekend",
    destination: overrides.destination ?? "Tahoe",
    description: overrides.description ?? null,
    start_date: overrides.start_date ?? "2026-07-10",
    end_date: overrides.end_date ?? "2026-07-12",
    notes: overrides.notes ?? null,
    user_id: overrides.user_id ?? 99,
    created_at: overrides.created_at ?? "2026-04-28T12:00:00Z",
    member_count: overrides.member_count ?? 1,
    members: overrides.members ?? [
      {
        user_id: 99,
        email: "owner@example.com",
        role: "member",
        joined_at: "2026-04-28T12:00:00Z",
        status: "active",
        workspace_last_seen_signature: null,
        workspace_last_seen_snapshot: null,
        workspace_last_seen_at: null,
      },
    ],
    pending_invites: overrides.pending_invites ?? [],
  };
}

describe("toTripWorkspaceViewModel", () => {
  it("treats the trip creator as owner even when membership role is not owner", () => {
    const trip = buildTrip();

    const vm = toTripWorkspaceViewModel(trip, "different@example.com", 99);

    expect(vm.isOwner).toBe(true);
  });

  it("does not mark unrelated members as owners", () => {
    const trip = buildTrip();

    const vm = toTripWorkspaceViewModel(trip, "member@example.com", 123);

    expect(vm.isOwner).toBe(false);
  });
});

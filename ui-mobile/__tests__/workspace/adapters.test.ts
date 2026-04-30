import {
  toTripWorkspaceCollaborationViewModel,
  toTripWorkspaceViewModel,
} from "@/features/trips/workspace/adapters";
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

  it("marks viewer roles as read-only", () => {
    const trip = buildTrip({
      user_id: 99,
      members: [
        {
          user_id: 123,
          email: "viewer@example.com",
          role: "viewer",
          joined_at: "2026-04-28T12:00:00Z",
          status: "accepted",
          workspace_last_seen_signature: null,
          workspace_last_seen_snapshot: null,
          workspace_last_seen_at: null,
        },
      ],
    });

    const vm = toTripWorkspaceViewModel(trip, "viewer@example.com", 123);

    expect(vm.currentUserRoleLabel).toBe("View only");
    expect(vm.canEdit).toBe(false);
    expect(vm.isReadOnly).toBe(true);
  });

  it("maps collaboration roles and pending invites to clear labels", () => {
    const baseMember = buildTrip().members[0]!;
    const trip = buildTrip({
      member_count: 4,
      members: [
        { ...baseMember, user_id: 1, email: "owner@example.com", role: "owner" },
        { ...baseMember, user_id: 2, email: "editor@example.com", role: "editor" },
        { ...baseMember, user_id: 3, email: "viewer@example.com", role: "viewer" },
      ],
      pending_invites: [
        {
          id: 88,
          email: "pending@example.com",
          status: "pending",
          created_at: "2026-04-28T12:00:00Z",
          expires_at: "2026-05-05T12:00:00Z",
        },
      ],
    });

    const vm = toTripWorkspaceCollaborationViewModel({
      trip,
      currentUserEmail: "owner@example.com",
      readiness: null,
      readinessLoading: false,
    });

    expect(vm.members.map((member) => member.roleLabel)).toEqual([
      "Owner",
      "Can edit",
      "View only",
    ]);
    expect(vm.pendingInvites[0]?.statusLabel).toBe("Pending");
  });

  it("builds traveler identity fallbacks and concrete collaboration copy", () => {
    const baseMember = buildTrip().members[0]!;
    const trip = buildTrip({
      member_count: 4,
      members: [
        {
          ...baseMember,
          user_id: 1,
          email: "owner@example.com",
          role: "owner",
          status: "accepted",
          display_name: "David",
        },
        {
          ...baseMember,
          user_id: 2,
          email: "davidlor2015@gmail.com",
          role: "editor",
          status: "accepted",
          display_name: null,
        },
        {
          ...baseMember,
          user_id: 3,
          email: "",
          role: "viewer",
          status: "accepted",
          display_name: null,
          name: null,
        },
      ],
      pending_invites: [
        {
          id: 88,
          email: "pending@example.com",
          status: "pending",
          created_at: "2026-04-28T12:00:00Z",
          expires_at: "2026-05-05T12:00:00Z",
        },
      ],
    });

    const vm = toTripWorkspaceCollaborationViewModel({
      trip,
      currentUserEmail: "owner@example.com",
      currentUserDisplayName: "David",
      readiness: null,
      readinessLoading: false,
    });

    expect(vm.members[0]?.displayLabel).toBe("David");
    expect(vm.members[0]?.supportingText).toBe("Can manage this trip and invite others.");
    expect(vm.members[1]?.displayLabel).toBe("Davidlor2015");
    expect(vm.members[1]?.supportingText).toBe(
      "Can edit itinerary, packing, budget, and reservations.",
    );
    expect(vm.members[2]?.displayLabel).toBe("Traveler");
    expect(vm.members[2]?.supportingText).toBe("Can view the shared trip plan.");
    expect(vm.pendingInvites[0]?.displayLabel).toBe("Invited traveler");
    expect(vm.pendingInvites[0]?.supportingText).toBe("Invite pending · Resend");
    expect(vm.pendingInvites[0]?.rolePillLabel).toBe("Can edit");
  });
});

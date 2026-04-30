import { render } from "@testing-library/react-native";

import { MembersTab } from "@/features/trips/workspace/MembersTab";
import type {
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "@/features/trips/workspace/adapters";

jest.mock("@/features/trips/workspace/InviteTravelerSheet", () => ({
  InviteTravelerSheet: () => null,
}));

function trip(overrides: Partial<TripWorkspaceViewModel> = {}): TripWorkspaceViewModel {
  return {
    id: 7,
    title: "Kyoto Escape",
    destination: "Kyoto, Japan",
    dateRange: "Oct 10, 2026 - Oct 15, 2026",
    durationDays: 6,
    status: "upcoming",
    statusLabel: "Upcoming",
    memberCount: 3,
    members: [],
    isOwner: true,
    canEdit: true,
    isReadOnly: false,
    currentUserRoleLabel: "Owner",
    ...overrides,
  };
}

function collaboration(
  overrides: Partial<TripWorkspaceCollaborationViewModel> = {},
): TripWorkspaceCollaborationViewModel {
  return {
    canInvite: true,
    groupDescription: "Track readiness, manage invites, and add travelers to the group.",
    members: [
      {
        userId: 1,
        email: "owner@example.com",
        displayLabel: "Owner",
        emailSecondary: "owner@example.com",
        roleLabel: "Owner",
        rolePillLabel: "Owner",
        supportingText: "Can manage this trip and invite others.",
        isCurrentUser: true,
        readinessLabel: "Unavailable",
        readinessVariant: "default",
        readinessDetail: "Readiness is unavailable.",
      },
      {
        userId: 2,
        email: "editor@example.com",
        displayLabel: "Editor",
        emailSecondary: "editor@example.com",
        roleLabel: "Can edit",
        rolePillLabel: "Can edit",
        supportingText: "Can edit itinerary, packing, budget, and reservations.",
        isCurrentUser: false,
        readinessLabel: "Unavailable",
        readinessVariant: "default",
        readinessDetail: "Readiness is unavailable.",
      },
      {
        userId: 3,
        email: "viewer@example.com",
        displayLabel: "Viewer",
        emailSecondary: "viewer@example.com",
        roleLabel: "View only",
        rolePillLabel: "View only",
        supportingText: "Can view the shared trip plan.",
        isCurrentUser: false,
        readinessLabel: "Unavailable",
        readinessVariant: "default",
        readinessDetail: "Readiness is unavailable.",
      },
    ],
    pendingInvites: [
      {
        id: 4,
        email: "pending@example.com",
        displayLabel: "Invited traveler",
        emailSecondary: "pending@example.com",
        rolePillLabel: "Can edit",
        supportingText: "Invite pending · Resend",
        statusLabel: "Pending",
        expiresAtLabel: "May 5, 2026",
      },
    ],
    ...overrides,
  };
}

describe("MembersTab role labels", () => {
  it("shows editorial group copy and traveler card hierarchy", () => {
    const { getAllByText, getByText, queryByText } = render(
      <MembersTab
        trip={trip()}
        collaboration={collaboration()}
        onInvite={jest.fn()}
        memberReadinessError={null}
      />,
    );

    expect(getByText("Everyone on the trip")).toBeTruthy();
    expect(
      getByText("Invite travelers, share the plan, and keep the group moving together."),
    ).toBeTruthy();
    expect(queryByText("In Progress")).toBeNull();
    expect(getAllByText("Owner").length).toBeGreaterThan(0);
    expect(getAllByText("Can edit").length).toBeGreaterThan(0);
    expect(getAllByText("View only").length).toBeGreaterThan(0);
    expect(getByText("Invited traveler")).toBeTruthy();
    expect(getByText("Invite pending · Resend")).toBeTruthy();
  });
});

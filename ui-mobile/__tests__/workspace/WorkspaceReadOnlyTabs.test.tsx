import { fireEvent, render } from "@testing-library/react-native";

import { BookingsTab } from "@/features/trips/workspace/BookingsTab";
import { OverviewTab } from "@/features/trips/workspace/OverviewTab";
import { PackingTab } from "@/features/trips/workspace/PackingTab";
import type {
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "@/features/trips/workspace/adapters";
import type { TripResponse } from "@/features/trips/types";

const mockUseWorkspaceOverviewModel = jest.fn();
const mockUseReservations = jest.fn();
const mockUsePackingList = jest.fn();
const mockUsePackingSuggestionsQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/trips/workspace/useWorkspaceOverviewModel", () => ({
  useWorkspaceOverviewModel: (...args: unknown[]) =>
    mockUseWorkspaceOverviewModel(...args),
}));

jest.mock("@/features/trips/reservations/hooks", () => ({
  useReservations: (...args: unknown[]) => mockUseReservations(...args),
}));

jest.mock("@/features/trips/packing/hooks", () => ({
  usePackingList: (...args: unknown[]) => mockUsePackingList(...args),
  usePackingSuggestionsQuery: (...args: unknown[]) =>
    mockUsePackingSuggestionsQuery(...args),
}));

jest.mock("@/features/trips/workspace/StopFormSheet", () => ({
  StopFormSheet: () => null,
}));

jest.mock("@/features/trips/workspace/RegenerateSheet", () => ({
  RegenerateSheet: () => null,
}));

function trip(): TripWorkspaceViewModel {
  return {
    id: 7,
    title: "Kyoto Escape",
    destination: "Kyoto, Japan",
    dateRange: "Oct 10, 2026 - Oct 15, 2026",
    durationDays: 6,
    status: "upcoming",
    statusLabel: "Upcoming",
    memberCount: 2,
    members: [],
    isOwner: false,
    canEdit: false,
    isReadOnly: true,
    currentUserRoleLabel: "View only",
  };
}

function collaboration(): TripWorkspaceCollaborationViewModel {
  return {
    canInvite: false,
    groupDescription: "See who's joined and how ready the group looks from here.",
    members: [],
    pendingInvites: [],
  };
}

function tripRaw(): TripResponse {
  return {
    id: 7,
    title: "Kyoto Escape",
    destination: "Kyoto, Japan",
    description: null,
    start_date: "2026-10-10",
    end_date: "2026-10-15",
    notes: null,
    user_id: 1,
    created_at: "2026-10-01T00:00:00Z",
    member_count: 2,
    members: [
      {
        user_id: 1,
        email: "viewer@example.com",
        role: "member",
        joined_at: "2026-10-01T00:00:00Z",
        status: "accepted",
        workspace_last_seen_signature: null,
        workspace_last_seen_snapshot: null,
        workspace_last_seen_at: null,
      },
      {
        user_id: 2,
        email: "owner@example.com",
        role: "owner",
        joined_at: "2026-10-01T00:00:00Z",
        status: "accepted",
        workspace_last_seen_signature: null,
        workspace_last_seen_snapshot: null,
        workspace_last_seen_at: null,
      },
    ],
    pending_invites: [],
  };
}

function overviewModel() {
  return {
    command: {
      nextActionTitle: "Build the plan",
      nextActionBody: "No itinerary saved yet.",
      attentionItems: [],
    },
    itineraryDayPreviews: [],
    itineraryDays: [],
    itineraryFilter: "all",
    setItineraryFilter: jest.fn(),
    itinerary: null,
    isStreaming: false,
    isItineraryDirty: false,
    isItineraryMissing: true,
    isSavingItinerary: false,
    isItineraryLoading: false,
    streamText: null,
    itineraryError: null,
    setEditingStop: jest.fn(),
    editingStop: null,
    selectedStop: null,
    dayOptions: [],
    timeOptions: [],
    stopMoveAvailability: {
      canMoveUp: false,
      canMoveDown: false,
      canMoveToPreviousDay: false,
      canMoveToNextDay: false,
    },
    handleAddDay: jest.fn(),
    handlePublishChanges: jest.fn(),
    handleSaveStop: jest.fn(),
    handleDeleteStop: jest.fn(),
    handleMoveStopUp: jest.fn(),
    handleMoveStopDown: jest.fn(),
    handleMoveStopToPreviousDay: jest.fn(),
    handleMoveStopToNextDay: jest.fn(),
    regeneratingDayIndex: null,
    setRegeneratingDayIndex: jest.fn(),
    handleAcceptRefinement: jest.fn(),
  };
}

describe("workspace read-only tabs", () => {
  beforeEach(() => {
    mockUseWorkspaceOverviewModel.mockReturnValue(overviewModel());
    mockUseReservations.mockReturnValue({
      loading: false,
      error: null,
      items: [],
      addReservation: jest.fn(),
      editReservation: jest.fn(),
      removeReservation: jest.fn(),
      reload: jest.fn(),
    });
    mockUsePackingList.mockReturnValue({
      loading: false,
      error: null,
      items: [],
      addItem: jest.fn(),
      toggleItem: jest.fn(),
      removeItem: jest.fn(),
      clearChecked: jest.fn(),
      editItem: jest.fn(),
      reload: jest.fn(),
    });
    mockUsePackingSuggestionsQuery.mockReturnValue({
      data: [],
      isError: false,
    });
  });

  it("shows a read-only notice on Overview and hides generate actions", () => {
    const { getByText, queryByText } = render(
      <OverviewTab
        trip={trip()}
        tripRaw={tripRaw()}
        currentUserEmail="viewer@example.com"
        summary={null}
        collaboration={collaboration()}
        onTripSnapshot={null}
        canOpenLiveView={false}
        streamState={undefined}
        onStartStream={jest.fn()}
        onCancelStream={jest.fn()}
        onOpenTab={jest.fn()}
        onOpenLiveView={jest.fn()}
        isReadOnly
      />,
    );

    expect(getByText("View-only trip")).toBeTruthy();
    expect(queryByText("Generate with AI")).toBeNull();
  });

  it("shows a read-only notice on Bookings and does not open the add form", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <BookingsTab tripId={7} isReadOnly />,
    );

    expect(getByText("View-only trip")).toBeTruthy();
    fireEvent.press(getByLabelText("Upload confirmation"));
    expect(queryByText("Save booking")).toBeNull();
  });

  it("shows a read-only notice on Packing and hides add-item actions", () => {
    const { getByText, queryByText } = render(
      <PackingTab tripId={7} isReadOnly />,
    );

    expect(getByText("View-only trip")).toBeTruthy();
    expect(queryByText("Add custom item")).toBeNull();
    expect(queryByText("Add item")).toBeNull();
  });
});

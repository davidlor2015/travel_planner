import { fireEvent, render } from "@testing-library/react-native";

import { OverviewTab } from "@/features/trips/workspace/OverviewTab";
import type { TripResponse } from "@/features/trips/types";
import type { TripWorkspaceViewModel } from "@/features/trips/workspace/adapters";

const mockUseWorkspaceOverviewModel = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/features/trips/workspace/useWorkspaceOverviewModel", () => ({
  useWorkspaceOverviewModel: (...args: unknown[]) =>
    mockUseWorkspaceOverviewModel(...args),
}));

describe("OverviewTab activity strip", () => {
  beforeEach(() => {
    mockUseWorkspaceOverviewModel.mockReturnValue({
      command: {
        nextActionTitle: "Review today's plan",
        nextActionBody: "Keep momentum with the next stop.",
        attentionItems: [],
      },
      itinerary: null,
      selectedStop: null,
      editingStop: null,
      dayOptions: [],
      timeOptions: [],
      stopMoveAvailability: {
        canMoveUp: false,
        canMoveDown: false,
        canMoveToPreviousDay: false,
        canMoveToNextDay: false,
      },
      regeneratingDayIndex: null,
      isItineraryLoading: false,
      isItineraryMissing: true,
      isItineraryDirty: false,
      isSavingItinerary: false,
      isStreaming: false,
      itineraryError: null,
      streamText: null,
      itineraryFilter: "all",
      itineraryDays: [],
      itineraryDayPreviews: [],
      showFullItinerary: false,
      setItineraryFilter: jest.fn(),
      setShowFullItinerary: jest.fn(),
      setEditingStop: jest.fn(),
      setRegeneratingDayIndex: jest.fn(),
      handleSaveStop: jest.fn(),
      handleDeleteStop: jest.fn(),
      handleAddDay: jest.fn(),
      handleDeleteDay: jest.fn(),
      handleMoveStopUp: jest.fn(),
      handleMoveStopDown: jest.fn(),
      handleMoveStopToPreviousDay: jest.fn(),
      handleMoveStopToNextDay: jest.fn(),
      handleAcceptRefinement: jest.fn(),
      handlePublishChanges: jest.fn(),
    });
  });

  function buildTripVm(): TripWorkspaceViewModel {
    return {
      id: 7,
      title: "Rome sprint",
      destination: "Rome, Italy",
      dateRange: "Apr 29, 2026 - May 2, 2026",
      durationDays: 4,
      status: "active",
      statusLabel: "In Progress",
      memberCount: 2,
      members: [{ email: "david@example.com" }, { email: "mia@example.com" }],
      isOwner: true,
      canEdit: true,
      isReadOnly: false,
      currentUserRoleLabel: "Owner",
    };
  }

  function buildTripRaw(): TripResponse {
    return {
      id: 7,
      title: "Rome sprint",
      destination: "Rome, Italy",
      description: null,
      start_date: "2026-04-29",
      end_date: "2026-05-02",
      notes: null,
      user_id: 1,
      created_at: "2026-04-20T18:00:00Z",
      member_count: 2,
      members: [
        {
          user_id: 1,
          email: "david@example.com",
          role: "owner",
          joined_at: "2026-04-20T18:00:00Z",
          status: "accepted",
          workspace_last_seen_signature: "old-sig",
          workspace_last_seen_snapshot: {
            version: 1,
            trip_id: 7,
            itinerary_day_count: 0,
            itinerary_stop_count: 0,
            reservation_upcoming: 0,
            reservation_total: 0,
            budget_spent: 0,
            budget_limit: null,
            packing_checked: 0,
            packing_total: 0,
            member_count: 2,
            pending_invite_count: 0,
            execution_confirmed_count: 0,
            execution_skipped_count: 0,
          },
          workspace_last_seen_at: "2026-04-20T18:00:00Z",
        },
        {
          user_id: 2,
          email: "mia@example.com",
          role: "member",
          joined_at: "2026-04-20T18:00:00Z",
          status: "accepted",
          workspace_last_seen_signature: null,
          workspace_last_seen_snapshot: null,
          workspace_last_seen_at: null,
        },
      ],
      pending_invites: [],
    };
  }

  it("renders activity strip and opens What changed sheet on tap", () => {
    const { getByText } = render(
      <OverviewTab
        trip={buildTripVm()}
        tripRaw={buildTripRaw()}
        currentUserEmail="david@example.com"
        summary={null}
        collaboration={null}
        onTripSnapshot={{
          generated_at: "2026-04-29T20:00:00Z",
          mode: "active",
          read_only: false,
          today: {
            day_number: 1,
            day_date: "2026-04-29",
            title: null,
            time: null,
            location: null,
            notes: null,
            lat: null,
            lon: null,
            status: "planned",
            source: "day_date_exact",
            confidence: "high",
            stop_ref: null,
            execution_status: null,
          },
          next_stop: {
            day_number: null,
            day_date: null,
            title: null,
            time: null,
            location: null,
            notes: null,
            lat: null,
            lon: null,
            status: "planned",
            source: "none",
            confidence: "low",
            stop_ref: null,
            execution_status: null,
          },
          today_stops: [
            {
              day_number: 1,
              day_date: "2026-04-29",
              title: "Colosseum Guided Tour",
              time: "10:00",
              location: "Rome",
              notes: null,
              lat: null,
              lon: null,
              status: "planned",
              source: "day_date_exact",
              confidence: "high",
              stop_ref: "100",
              execution_status: "confirmed",
              status_updated_by_user_id: 1,
              status_updated_by_display_name: "David",
              status_updated_by_email: "david@example.com",
              status_updated_at: "2026-04-29T20:00:00Z",
            },
          ],
          today_unplanned: [],
          blockers: [],
        }}
        canOpenLiveView={false}
        streamState={undefined}
        onStartStream={jest.fn()}
        onCancelStream={jest.fn()}
        onOpenTab={jest.fn()}
        onOpenLiveView={jest.fn()}
      />,
    );

    expect(getByText("What changed")).toBeTruthy();
    expect(getByText("David confirmed Colosseum Guided Tour")).toBeTruthy();

    fireEvent.press(getByText("What changed"));
    expect(getByText("Recent trip activity")).toBeTruthy();
  });

  it("shows a non-blocking error message when activity loading fails", () => {
    const { getByText } = render(
      <OverviewTab
        trip={buildTripVm()}
        tripRaw={buildTripRaw()}
        currentUserEmail="david@example.com"
        summary={null}
        collaboration={null}
        onTripSnapshot={null}
        canOpenLiveView={false}
        streamState={undefined}
        onStartStream={jest.fn()}
        onCancelStream={jest.fn()}
        onOpenTab={jest.fn()}
        onOpenLiveView={jest.fn()}
        activityLoadError="Couldn't load recent activity."
      />,
    );

    expect(getByText("Couldn't load recent activity.")).toBeTruthy();
    expect(getByText("NEXT ACTION")).toBeTruthy();
  });

  it("hides recent activity section when there are no meaningful updates", () => {
    const { queryByText } = render(
      <OverviewTab
        trip={buildTripVm()}
        tripRaw={buildTripRaw()}
        currentUserEmail="david@example.com"
        summary={null}
        collaboration={null}
        onTripSnapshot={null}
        canOpenLiveView={false}
        streamState={undefined}
        onStartStream={jest.fn()}
        onCancelStream={jest.fn()}
        onOpenTab={jest.fn()}
        onOpenLiveView={jest.fn()}
      />,
    );

    expect(queryByText("RECENT ACTIVITY")).toBeNull();
    expect(queryByText("What changed")).toBeNull();
    expect(queryByText("No recent changes yet.")).toBeNull();
  });
});

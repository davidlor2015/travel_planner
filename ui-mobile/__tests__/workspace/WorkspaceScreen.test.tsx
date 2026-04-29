import type { ReactNode } from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import { WorkspaceScreen } from "@/features/trips/workspace/WorkspaceScreen";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDeleteTrip = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 11, email: "owner@example.com" },
  }),
}));

jest.mock("@/features/ai/hooks", () => ({
  useSavedItineraryQuery: () => ({
    data: null,
    isError: false,
  }),
}));

jest.mock("@/features/ai/useStreamingItinerary", () => ({
  useStreamingItinerary: () => ({
    streams: {},
    start: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock("@/features/trips/hooks", () => ({
  useOnTripSnapshotQuery: () => ({
    data: null,
  }),
}));

jest.mock("@/features/trips/onTrip/eligibility", () => ({
  canOpenOnTrip: () => false,
}));

jest.mock("@/features/trips/workspace/useTripWorkspaceModel", () => ({
  useTripWorkspaceModel: () => ({
    tripQuery: {
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    },
    tripRaw: {
      id: 7,
      title: "Kyoto Escape",
      destination: "Kyoto, Japan",
      description: null,
      start_date: "2026-10-10",
      end_date: "2026-10-15",
      notes: "Slow mornings and temple walks",
      user_id: 11,
      created_at: "2026-04-28T12:00:00Z",
      member_count: 1,
      members: [],
      pending_invites: [],
      status: "upcoming",
    },
    trip: {
      id: 7,
      title: "Kyoto Escape",
      destination: "Kyoto, Japan",
      dateRange: "Oct 10, 2026 – Oct 15, 2026",
      durationDays: 6,
      status: "upcoming",
      statusLabel: "Upcoming",
      memberCount: 1,
      members: [{ email: "owner@example.com" }],
      isOwner: true,
    },
    summary: null,
    collaboration: {},
    memberReadinessError: null,
    invitePending: false,
    onInvite: jest.fn(),
    switcherTrips: [],
    isCreatingTrip: false,
    isUpdatingTrip: false,
    isDeletingTrip: false,
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: mockDeleteTrip,
    isSolo: true,
    showGroupCoordination: false,
    isNotFound: false,
  }),
}));

jest.mock("@/features/trips/workspace/WorkspaceTripHeader", () => ({
  WorkspaceTripHeader: ({ onEditPress }: { onEditPress: () => void }) => {
    const { Pressable: P, Text: T } = require("react-native");
    return (
      <P onPress={onEditPress}>
        <T>Edit trip details</T>
      </P>
    );
  },
}));

jest.mock("@/features/trips/workspace/WorkspaceTabBar", () => ({
  WorkspaceTabBar: () => null,
}));

jest.mock("@/features/trips/workspace/OverviewTab", () => ({
  OverviewTab: () => null,
}));

jest.mock("@/features/trips/workspace/BookingsTab", () => ({
  BookingsTab: () => null,
}));

jest.mock("@/features/trips/workspace/BudgetTab", () => ({
  BudgetTab: () => null,
}));

jest.mock("@/features/trips/workspace/PackingTab", () => ({
  PackingTab: () => null,
}));

jest.mock("@/features/trips/workspace/MapTab", () => ({
  MapTab: () => null,
}));

jest.mock("@/features/trips/workspace/MembersTab", () => ({
  MembersTab: () => null,
}));

jest.mock("@/features/trips/TripSwitcherSheet", () => ({
  TripSwitcherSheet: () => null,
}));

jest.mock("@/features/trips/TripFormSheet", () => ({
  TripFormSheet: ({
    visible,
    mode,
    onDeleteTrip,
    error,
  }: {
    visible: boolean;
    mode: "create" | "edit";
    onDeleteTrip?: () => void;
    error?: string | null;
  }) => {
    const { View: V, Text: T, Pressable: P } = require("react-native");
    if (!visible) return null;
    return (
      <V>
        <T>{mode === "edit" ? "Edit trip" : "Create trip"}</T>
        {mode === "edit" && onDeleteTrip ? (
          <P onPress={onDeleteTrip}>
            <T>Delete trip</T>
          </P>
        ) : null}
        {error ? <T>{error}</T> : null}
      </V>
    );
  },
}));

describe("WorkspaceScreen delete trip flow", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockDeleteTrip.mockReset();
  });

  it("opens a delete confirmation and deletes the trip after confirmation", async () => {
    mockDeleteTrip.mockResolvedValue(undefined);

    const { getAllByText, getByText, queryByText } = render(<WorkspaceScreen tripId={7} />);

    fireEvent.press(getByText("Edit trip details"));
    fireEvent.press(getByText("Delete trip"));

    expect(getByText("Delete trip?")).toBeTruthy();
    expect(
      getByText(
        "This permanently removes this trip, including its itinerary, budget, packing list, and reservations.",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(getAllByText("Delete trip")[1]!);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDeleteTrip).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/trips");
    expect(queryByText("Delete trip?")).toBeNull();
  });

  it("shows an error when delete fails", async () => {
    mockDeleteTrip.mockRejectedValue(new Error("delete failed"));

    const { getAllByText, getByText } = render(<WorkspaceScreen tripId={7} />);

    fireEvent.press(getByText("Edit trip details"));
    fireEvent.press(getByText("Delete trip"));

    await act(async () => {
      fireEvent.press(getAllByText("Delete trip")[1]!);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDeleteTrip).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(getByText("We couldn't delete the trip. Try again.")).toBeTruthy();
  });
});

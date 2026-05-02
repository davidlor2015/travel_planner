// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render } from "@testing-library/react-native";

import { TodayScreen } from "@/features/today/TodayScreen";
import type { TodayModel } from "@/features/today/useTodayModel";
import type { TripResponse } from "@/features/trips/types";

const mockOnTripScreen = jest.fn(
  (_props: Record<string, unknown>) => null as ReactNode,
);

jest.mock("@/features/trips/onTrip/OnTripScreen", () => ({
  OnTripScreen: (props: Record<string, unknown>) => mockOnTripScreen(props),
}));

function buildTrip(overrides: Partial<TripResponse> = {}): TripResponse {
  return {
    id: 5,
    title: "Kyoto Escape",
    destination: "Kyoto, Japan",
    description: null,
    start_date: "2026-10-10",
    end_date: "2026-10-15",
    notes: null,
    user_id: 1,
    created_at: "2026-04-01T00:00:00Z",
    member_count: 1,
    members: [],
    pending_invites: [],
    ...overrides,
  };
}

function buildModel(overrides: Partial<TodayModel> = {}): TodayModel {
  return {
    isLoading: false,
    activeTrip: null,
    nextUpcomingTrip: null,
    daysUntilNextTrip: null,
    ...overrides,
  };
}

const mockModel = { current: buildModel() };

jest.mock("@/features/today/useTodayModel", () => ({
  useTodayModel: () => mockModel.current,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/shared/ui/ScreenLoading", () => ({
  ScreenLoading: () => null,
}));

describe("TodayScreen", () => {
  beforeEach(() => {
    mockOnTripScreen.mockClear();
    mockModel.current = buildModel();
  });

  it("renders OnTripScreen with trip props when activeTrip exists", () => {
    const trip = buildTrip();
    mockModel.current = buildModel({ activeTrip: trip });

    render(<TodayScreen />);

    expect(mockOnTripScreen).toHaveBeenCalledTimes(1);
    expect(mockOnTripScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: trip.id,
        tripTitle: trip.title,
        tripDestination: trip.destination,
        tripStartDate: trip.start_date,
        members: trip.members,
      }),
    );
  });

  it("shows horizon empty copy when no active trip and no upcoming trip", () => {
    mockModel.current = buildModel({
      activeTrip: null,
      nextUpcomingTrip: null,
    });

    const { getByText } = render(<TodayScreen />);

    expect(getByText(/Nothing on the/)).toBeTruthy();
    expect(
      getByText(/Today becomes your quiet travel companion/),
    ).toBeTruthy();
  });

  it("shows between-adventures copy when no active trip but upcoming exists", () => {
    mockModel.current = buildModel({
      activeTrip: null,
      nextUpcomingTrip: buildTrip({ id: 9, title: "Soon Trip" }),
      daysUntilNextTrip: 3,
    });

    const { getByText } = render(<TodayScreen />);

    expect(getByText("Between adventures.")).toBeTruthy();
    expect(getByText("Soon Trip")).toBeTruthy();
  });
});

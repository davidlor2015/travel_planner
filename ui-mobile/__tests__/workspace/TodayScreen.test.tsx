// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render } from "@testing-library/react-native";

import { TodayScreen } from "@/features/today/TodayScreen";
import type { TodayModel } from "@/features/today/useTodayModel";
import type { TripResponse } from "@/features/trips/types";

// ─── Shared mock data ──────────────────────────────────────────────────────────

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
    nextStop: null,
    laterStop: null,
    snapshot: null,
    totalTripDays: 6,
    snapshotIsError: false,
    snapshotErrorMessage: null,
    refetchSnapshot: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── Module mocks ──────────────────────────────────────────────────────────────

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

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: ReactNode }) => children ?? null,
}));

jest.mock("@/shared/ui/ScreenLoading", () => ({
  ScreenLoading: () => null,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TodayScreen — snapshot error state", () => {
  it("shows a load-error message when snapshotIsError is true", () => {
    mockModel.current = buildModel({
      activeTrip: buildTrip(),
      snapshotIsError: true,
      snapshotErrorMessage: "Network error",
    });

    const { getByText } = render(<TodayScreen />);

    expect(getByText(/couldn't be loaded/i)).toBeTruthy();
  });

  it("does not render 'You're clear for now' when snapshotIsError is true", () => {
    mockModel.current = buildModel({
      activeTrip: buildTrip(),
      snapshotIsError: true,
      snapshotErrorMessage: "Network error",
      nextStop: null,
    });

    const { queryByText } = render(<TodayScreen />);

    expect(queryByText(/clear for now/i)).toBeNull();
  });

  it("renders 'You're clear for now' when snapshot loaded successfully and no next stop", () => {
    mockModel.current = buildModel({
      activeTrip: buildTrip(),
      snapshotIsError: false,
      nextStop: null,
    });

    const { getByText } = render(<TodayScreen />);

    expect(getByText(/clear for now/i)).toBeTruthy();
  });

  it("does not render the later-stop section when snapshotIsError is true", () => {
    mockModel.current = buildModel({
      activeTrip: buildTrip(),
      snapshotIsError: true,
      snapshotErrorMessage: "Network error",
      laterStop: {
        day_number: 1,
        stop_ref: "stop-x",
        title: "Dinner at Nishiki",
        time: "19:00",
        location: "Kyoto",
        notes: null,
        day_date: "2026-10-10",
        lat: null,
        lon: null,
        status: "planned" as const,
        source: "day_date_exact" as const,
        confidence: "high" as const,
        execution_status: null,
      },
    });

    const { queryByText } = render(<TodayScreen />);

    expect(queryByText("A little later")).toBeNull();
  });
});

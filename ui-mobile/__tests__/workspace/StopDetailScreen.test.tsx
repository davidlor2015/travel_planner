// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render } from "@testing-library/react-native";

import { StopDetailScreen } from "@/features/trips/onTrip/StopDetailScreen";
import type { TripOnTripSnapshot } from "@/features/trips/types";

// ─── Shared mock data ──────────────────────────────────────────────────────────

const STOP_REF = "stop-001";

const NULL_STOP = {
  day_number: null,
  day_date: null,
  title: null,
  time: null,
  location: null,
  notes: null,
  lat: null,
  lon: null,
  status: "planned" as const,
  source: "none" as const,
  confidence: "low" as const,
  stop_ref: null,
  execution_status: null,
};

function buildSnapshot(isReadOnly: boolean): TripOnTripSnapshot {
  return {
    generated_at: "2026-10-10T00:00:00Z",
    mode: "active",
    read_only: isReadOnly,
    today: { ...NULL_STOP, day_number: 1, day_date: "2026-10-10" },
    today_stops: [
      {
        ...NULL_STOP,
        stop_ref: STOP_REF,
        title: "Kinkaku-ji",
        time: "09:00",
        location: "Kyoto",
        day_date: "2026-10-10",
        day_number: 1,
        source: "day_date_exact" as const,
        confidence: "high" as const,
      },
    ],
    today_unplanned: [],
    next_stop: NULL_STOP,
    blockers: [],
  };
}

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockSnapshotData = { current: buildSnapshot(false) };

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/features/trips/hooks", () => ({
  useOnTripSnapshotQuery: () => ({
    isLoading: false,
    isError: false,
    data: mockSnapshotData.current,
    refetch: jest.fn(),
  }),
  useTripDetailQuery: () => ({ data: null }),
}));

jest.mock("@/features/trips/onTrip/hooks", () => ({
  useOnTripMutations: () => ({
    viewSnapshot: null,
    statusPending: {},
    unplannedPendingIds: {},
    isLoggingUnplanned: false,
    feedback: null,
    dismissFeedback: jest.fn(),
    setStopStatus: jest.fn(),
    logUnplannedStop: jest.fn(),
    removeUnplannedStop: jest.fn(),
  }),
}));

jest.mock("@/shared/ui/ScreenLoading", () => ({ ScreenLoading: () => null }));
jest.mock("@/shared/ui/ScreenError", () => ({ ScreenError: () => null }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("StopDetailScreen", () => {
  it("does not render the Call venue placeholder tile", () => {
    mockSnapshotData.current = buildSnapshot(false);
    const { queryByText } = render(<StopDetailScreen tripId={1} stopKey={STOP_REF} />);
    expect(queryByText("Call venue")).toBeNull();
  });

  it("does not render the Add a note placeholder tile", () => {
    mockSnapshotData.current = buildSnapshot(false);
    const { queryByText } = render(<StopDetailScreen tripId={1} stopKey={STOP_REF} />);
    expect(queryByText("Add a note")).toBeNull();
  });

  it("renders the wired action tiles when not read-only", () => {
    mockSnapshotData.current = buildSnapshot(false);
    const { getByText } = render(<StopDetailScreen tripId={1} stopKey={STOP_REF} />);
    expect(getByText("I'm here")).toBeTruthy();
    expect(getByText("Skip this")).toBeTruthy();
  });

  it("shows the read-only notice and hides action tiles when isReadOnly is true", () => {
    mockSnapshotData.current = buildSnapshot(true);
    const { getByText, queryByText } = render(
      <StopDetailScreen tripId={1} stopKey={STOP_REF} />,
    );
    expect(getByText(/read-only mode/i)).toBeTruthy();
    expect(queryByText("I'm here")).toBeNull();
    expect(queryByText("Skip this")).toBeNull();
  });
});

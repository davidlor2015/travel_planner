// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render } from "@testing-library/react-native";

import { OnTripScreen } from "@/features/trips/onTrip/OnTripScreen";
import type { OnTripViewModel } from "@/features/trips/onTrip/adapters";
import type { TripOnTripSnapshot } from "@/features/trips/types";

// ─── Shared mock data ──────────────────────────────────────────────────────────

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

function buildSnapshot(
  overrides: Partial<TripOnTripSnapshot> = {},
): TripOnTripSnapshot {
  return {
    generated_at: "2026-10-10T00:00:00Z",
    mode: "active",
    read_only: false,
    today: { ...NULL_STOP, day_number: 1, day_date: "2026-10-10" },
    today_stops: [],
    today_unplanned: [],
    next_stop: NULL_STOP,
    blockers: [],
    ...overrides,
  };
}

function buildVm(overrides: Partial<OnTripViewModel> = {}): OnTripViewModel {
  return {
    now: null,
    next: null,
    timeline: [],
    unplanned: [],
    blockers: [],
    defaultLogDate: "2026-10-10",
    isReadOnly: false,
    isDayComplete: false,
    ...overrides,
  };
}

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockDeriveOnTripViewModel = jest.fn();
const mockUseOnTripSnapshotQuery = jest.fn();
const mockUseOnTripMutations = jest.fn();

jest.mock("@/features/trips/onTrip/adapters", () => ({
  deriveOnTripViewModel: (...args: unknown[]) =>
    mockDeriveOnTripViewModel(...args),
  stopVariant: () => "upcoming" as const,
  todayLocalISODate: () => "2026-10-10",
  currentLocalMinutes: () => 0,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/features/trips/hooks", () => ({
  useOnTripSnapshotQuery: (...args: unknown[]) =>
    mockUseOnTripSnapshotQuery(...args),
}));

jest.mock("@/features/ai/hooks", () => ({
  useSavedItineraryQuery: () => ({ data: null, isError: false }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: 7, email: "david@example.com", display_name: "David" },
  }),
}));

jest.mock("@/features/trips/onTrip/hooks", () => ({
  useOnTripMutations: (...args: unknown[]) => mockUseOnTripMutations(...args),
}));

const mockHasResolvedTodayStop = jest.fn().mockReturnValue(false);
const mockIsResolvedStop = jest.fn().mockReturnValue(false);

jest.mock("@/features/trips/onTrip/eligibility", () => ({
  hasResolvedTodayStop: (...args: unknown[]) =>
    mockHasResolvedTodayStop(...args),
  isResolvedStop: (...args: unknown[]) => mockIsResolvedStop(...args),
}));

jest.mock("@/features/trips/onTrip/HappeningNowCard", () => ({
  HappeningNowCard: ({
    stop,
  }: {
    stop: { title?: string | null; key: string };
  }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{`NowCard:${stop.key}`}</Text>;
  },
}));

jest.mock("@/features/trips/onTrip/TimelineRow", () => ({
  TimelineRow: ({ stop }: { stop: { title?: string | null; key: string } }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{`TimelineRow:${stop.key}`}</Text>;
  },
}));

jest.mock("@/features/trips/onTrip/NeedsAttentionCard", () => ({
  NeedsAttentionCard: ({ blockers }: { blockers: { title: string }[] }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{`NeedsAttention:${blockers[0]?.title ?? ""}`}</Text>;
  },
}));

jest.mock("@/features/trips/onTrip/OnTripHeader", () => ({
  OnTripHeader: ({
    eyebrow,
    dateLabel,
  }: {
    eyebrow: string;
    dateLabel?: string | null;
  }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View>
        <Text testID="on-trip-header-eyebrow">{eyebrow}</Text>
        {dateLabel ? (
          <Text testID="on-trip-header-date-label">{dateLabel}</Text>
        ) : null}
      </View>
    );
  },
}));

jest.mock("@/features/trips/onTrip/LogStopSheet", () => ({
  LogStopSheet: () => null,
}));

jest.mock("@/shared/ui/ScreenLoading", () => ({
  ScreenLoading: () => null,
}));

jest.mock("@/shared/ui/ScreenError", () => ({
  ScreenError: ({ message }: { message: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{`ScreenError:${message}`}</Text>;
  },
}));

// ─── Default mock factories ────────────────────────────────────────────────────

function buildDefaultSnapshotQuery(
  overrides: Partial<{
    isLoading: boolean;
    isError: boolean;
    data: ReturnType<typeof buildSnapshot> | undefined;
    dataUpdatedAt: number;
    refreshFailedWithCache: boolean;
  }> = {},
) {
  return {
    isLoading: false,
    isError: false,
    data: buildSnapshot(),
    dataUpdatedAt: 0,
    refreshFailedWithCache: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildMutations(
  overrides: Partial<{
    viewSnapshot: ReturnType<typeof buildSnapshot> | null;
    lastRefreshedAt: number;
    refreshFailed: boolean;
    feedback: { kind: "error" | "success"; message: string; at: number } | null;
  }> = {},
) {
  return {
    viewSnapshot: null,
    statusPending: {},
    unplannedPendingIds: {},
    isLoggingUnplanned: false,
    feedback: null,
    dismissFeedback: jest.fn(),
    setStopStatus: jest.fn(),
    logUnplannedStop: jest.fn(),
    removeUnplannedStop: jest.fn(),
    lastRefreshedAt: 0,
    refreshFailed: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OnTripScreen", () => {
  beforeEach(() => {
    mockDeriveOnTripViewModel.mockReset();
    mockUseOnTripSnapshotQuery.mockReturnValue(buildDefaultSnapshotQuery());
    mockUseOnTripMutations.mockReturnValue(buildMutations());
    mockHasResolvedTodayStop.mockReturnValue(false);
    mockIsResolvedStop.mockReturnValue(false);
  });

  it("shows the read-only banner when isReadOnly is true", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm({ isReadOnly: true }));

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText("View-only trip")).toBeTruthy();
  });

  it("does not show the read-only banner when isReadOnly is false", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm({ isReadOnly: false }));

    const { queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(queryByText("View-only trip")).toBeNull();
  });

  it("mounts NeedsAttentionCard when blockers are present", () => {
    mockDeriveOnTripViewModel.mockReturnValue(
      buildVm({
        blockers: [
          {
            id: "today-planned-open",
            bucket: "on_trip_execution",
            severity: "watch",
            title: "2 stops still need review",
            detail: "2",
            owner_email: null,
          },
        ],
      }),
    );

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText(/NeedsAttention:2 stops still need review/)).toBeTruthy();
  });

  it("does not mount NeedsAttentionCard when blockers is empty", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm({ blockers: [] }));

    const { queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(queryByText(/NeedsAttention:/)).toBeNull();
  });

  it("does not render the now-stop as a TimelineRow when it appears in HappeningNowCard", () => {
    const nowStop = {
      key: "stop-abc",
      stop_ref: "stop-abc",
      title: "Fushimi Inari",
      time: "10:00",
      location: "Kyoto",
      notes: null,
      day_number: 1,
      day_date: "2026-10-10",
      lat: null,
      lon: null,
      status: "planned" as const,
      source: "day_date_exact" as const,
      confidence: "high" as const,
      execution_status: null,
      effectiveStatus: "planned" as const,
      isPending: false,
      isReadOnly: false,
      statusUpdatedByUserId: null,
      statusUpdatedByName: null,
      statusUpdatedAt: null,
      statusActionLabel: null,
      statusActionDetailLabel: null,
    };

    mockDeriveOnTripViewModel.mockReturnValue(
      buildVm({
        now: nowStop,
        timeline: [nowStop],
      }),
    );

    const { getByText, queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText("NowCard:stop-abc")).toBeTruthy();
    expect(queryByText("TimelineRow:stop-abc")).toBeNull();
  });

  it("renders the inline log extra stop action when not read-only", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm({ isReadOnly: false }));

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText("+ Log extra stop")).toBeTruthy();
  });

  it("hides the inline log extra stop action when read-only", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm({ isReadOnly: true }));

    const { queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(queryByText("+ Log extra stop")).toBeNull();
  });

  // ─── Stale / offline awareness ─────────────────────────────────────────────

  it("shows the last-updated label when lastRefreshedAt is set", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm());
    mockUseOnTripSnapshotQuery.mockReturnValue(
      buildDefaultSnapshotQuery({ dataUpdatedAt: Date.now() }),
    );
    // Let hasResolvedTodayStop return true so the Today section renders
    // (otherwise showNoStopsToday=true hides the header that holds the label)
    mockHasResolvedTodayStop.mockReturnValue(true);

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText(/Last updated just now/i)).toBeTruthy();
  });

  it("shows saved-details copy when refresh fails and cached data is present", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm());
    mockUseOnTripSnapshotQuery.mockReturnValue(
      buildDefaultSnapshotQuery({
        dataUpdatedAt: Date.now(),
        refreshFailedWithCache: true,
      }),
    );
    mockHasResolvedTodayStop.mockReturnValue(true);

    const { getByText, queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText(/Showing saved trip details/i)).toBeTruthy();
    // Full error screen must NOT replace the content
    expect(queryByText(/ScreenError:/i)).toBeNull();
  });

  it("shows the full error screen when isError is true and no data has loaded", () => {
    mockUseOnTripSnapshotQuery.mockReturnValue(
      buildDefaultSnapshotQuery({ isError: true, data: undefined }),
    );
    // deriveOnTripViewModel won't be called; no vm needed

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText(/ScreenError:/i)).toBeTruthy();
  });

  // ─── Day-scoping and day-complete ──────────────────────────────────────────

  it("shows DayCompleteCard when isDayComplete is true and no focusStop", () => {
    // All stops confirmed — adapter sets isDayComplete=true, now/next=null.
    mockDeriveOnTripViewModel.mockReturnValue(
      buildVm({ isDayComplete: true, now: null, next: null }),
    );

    const { getByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(getByText(/All planned stops for today are done/i)).toBeTruthy();
  });

  it("does not show DayCompleteCard when the current day has an unresolved stop", () => {
    const unresolvedStop = {
      key: "stop-day4",
      stop_ref: "stop-day4",
      title: "Kinkaku-ji",
      time: "10:00",
      location: "Kyoto",
      notes: null,
      day_number: 4,
      day_date: "2026-10-13",
      lat: null,
      lon: null,
      status: "planned" as const,
      source: "day_date_exact" as const,
      confidence: "high" as const,
      execution_status: null,
      effectiveStatus: "planned" as const,
      isPending: false,
      isReadOnly: false,
      statusUpdatedByUserId: null,
      statusUpdatedByName: null,
      statusUpdatedAt: null,
      statusActionLabel: null,
      statusActionDetailLabel: null,
    };

    mockDeriveOnTripViewModel.mockReturnValue(
      buildVm({ isDayComplete: false, next: unresolvedStop }),
    );

    const { queryByText } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    expect(queryByText(/All planned stops for today are done/i)).toBeNull();
    // The stop is rendered via HappeningNowCard mock
    expect(queryByText(/NowCard:stop-day4/i)).toBeTruthy();
  });

  it("OnTripHeader receives eyebrow that contains the day number but not the calendar date", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm());
    // snapshot has today.day_date = "2026-10-10" → buildOnTripDayHeader produces
    // eyebrow "ON TRIP · DAY 1"; date moves to the separate dateLabel field
    const { getByTestId } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    const eyebrow = getByTestId("on-trip-header-eyebrow").props
      .children as string;
    expect(eyebrow).toMatch(/DAY 1/i);
    expect(eyebrow).not.toMatch(/Oct 10/i);
  });

  it("OnTripHeader receives the active day date in dateLabel", () => {
    mockDeriveOnTripViewModel.mockReturnValue(buildVm());
    // snapshot has today.day_date = "2026-10-10" → dateLabel "SATURDAY · OCT 10"
    const { getByTestId } = render(
      <OnTripScreen
        tripId={1}
        tripTitle="Kyoto"
        tripDestination="Kyoto, Japan"
      />,
    );

    const dateLabel = getByTestId("on-trip-header-date-label").props
      .children as string;
    expect(dateLabel).toMatch(/OCT 10/i);
  });
});

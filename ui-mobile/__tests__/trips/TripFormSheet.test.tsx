import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { RenderAPI } from "@testing-library/react-native";

import { buildCreateTripPayload, TripFormSheet } from "@/features/trips/TripFormSheet";
import { searchPlaces } from "@/features/trips/api";
import type { TripResponse } from "@/features/trips/types";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => {
  return {
    Ionicons: () => null,
  };
});

jest.mock("@/features/trips/api", () => ({
  searchPlaces: jest.fn().mockResolvedValue([]),
}));

const mockSearchPlaces = jest.mocked(searchPlaces);

function buildTrip(overrides: Partial<TripResponse> = {}): TripResponse {
  return {
    id: overrides.id ?? 7,
    title: overrides.title ?? "Kyoto Escape",
    destination: overrides.destination ?? "Kyoto, Japan",
    description: overrides.description ?? null,
    start_date: overrides.start_date ?? "2026-10-10",
    end_date: overrides.end_date ?? "2026-10-15",
    notes: overrides.notes ?? "Slow mornings and temple walks",
    user_id: overrides.user_id ?? 11,
    created_at: overrides.created_at ?? "2026-04-28T12:00:00Z",
    member_count: overrides.member_count ?? 1,
    members: overrides.members ?? [],
    pending_invites: overrides.pending_invites ?? [],
  };
}

describe("TripFormSheet", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-01T12:00:00"));
    mockSearchPlaces.mockReset();
    mockSearchPlaces.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  function chooseVisibleDateRange(
    view: RenderAPI,
    startFullDate: string,
    endFullDate: string,
  ) {
    fireEvent.press(view.getByLabelText("Start date, Choose date"));
    fireEvent.press(view.getByLabelText(`Choose ${startFullDate}`));
    fireEvent.press(view.getByLabelText(`Choose ${endFullDate}`));
    fireEvent.press(view.getByText("Confirm dates"));
  }

  it("renders the add trip flow with core fields and actions", () => {
    const { getAllByText, getByLabelText, getByPlaceholderText, getByText, queryByPlaceholderText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(getAllByText("Create trip")).toHaveLength(2);
    expect(getByText("Cancel")).toBeTruthy();
    expect(getByText("Trip title")).toBeTruthy();
    expect(getByText("Destination")).toBeTruthy();
    expect(getByText("+ Choose destination")).toBeTruthy();
    expect(getAllByText("Budget").length).toBeGreaterThan(0);
    expect(getByText("Pace")).toBeTruthy();
    expect(getByText("Interests")).toBeTruthy();
    expect(getByPlaceholderText("e.g. Summer in Rome")).toBeTruthy();
    expect(getByLabelText("Start date, Choose date")).toBeTruthy();
    expect(getByLabelText("End date, Choose date")).toBeTruthy();
    expect(queryByPlaceholderText("2026-07-10")).toBeNull();
    expect(queryByPlaceholderText("2026-07-16")).toBeNull();
  });

  it("renders the edit trip flow with notes and save action", () => {
    const trip = buildTrip();
    const { getByDisplayValue, getByLabelText, getByPlaceholderText, getByText } = render(
      <TripFormSheet
        visible
        mode="edit"
        trip={trip}
        canDeleteTrip
        onClose={jest.fn()}
        onDeleteTrip={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(getByText("Edit trip")).toBeTruthy();
    expect(getByText("Save changes")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
    expect(getByDisplayValue("Kyoto Escape")).toBeTruthy();
    expect(getByText("Kyoto, Japan")).toBeTruthy();
    expect(getByText("Change")).toBeTruthy();
    expect(getByLabelText("Start date, Oct 10, 2026")).toBeTruthy();
    expect(getByLabelText("End date, Oct 15, 2026")).toBeTruthy();
    expect(getByDisplayValue("Slow mornings and temple walks")).toBeTruthy();
    expect(getByPlaceholderText("Pace, budget, interests, reminders")).toBeTruthy();
    expect(getByText("Delete trip")).toBeTruthy();
  });

  it("opens the date range picker sheet from either date field", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByLabelText("Start date, Choose date"));
    expect(getByText("When is your trip?")).toBeTruthy();
    fireEvent.press(getByLabelText("Close date picker"));
    expect(queryByText("When is your trip?")).toBeNull();

    fireEvent.press(getByLabelText("End date, Choose date"));
    expect(getByText("When is your trip?")).toBeTruthy();
  });

  it("selects a start and end date and updates the formatted field labels", () => {
    const view = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    chooseVisibleDateRange(view, "April 10, 2026", "April 15, 2026");

    expect(view.getByLabelText("Start date, Apr 10, 2026")).toBeTruthy();
    expect(view.getByLabelText("End date, Apr 15, 2026")).toBeTruthy();
  });

  it("shows a clear date validation message only after submit is attempted", () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getAllByText, getByText, queryByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(queryByText("Choose your trip dates before continuing.")).toBeNull();

    fireEvent.press(getAllByText("Create trip")[1]!);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(getByText("Choose your trip dates before continuing.")).toBeTruthy();
  });

  it("handles an end-before-start selection by treating the earlier date as the new start", () => {
    const view = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(view.getByLabelText("Start date, Choose date"));
    fireEvent.press(view.getByLabelText("Choose April 20, 2026"));
    fireEvent.press(view.getByLabelText("Choose April 10, 2026"));

    expect(view.getByText("Choose an end date")).toBeTruthy();
    expect(view.getByText("Apr 10 selected")).toBeTruthy();

    fireEvent.press(view.getByText("Confirm dates"));

    expect(view.getByLabelText("Start date, Apr 10, 2026")).toBeTruthy();
    expect(view.getByLabelText("End date, Apr 11, 2026")).toBeTruthy();
  });

  it("shows the selected range summary across month navigation", () => {
    const view = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(view.getByLabelText("Start date, Choose date"));
    fireEvent.press(view.getByLabelText("Choose April 29, 2026"));
    expect(view.getByText("Choose an end date")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Show next month"));
    fireEvent.press(view.getByLabelText("Choose May 3, 2026"));

    expect(view.getByText("Apr 29 — May 3")).toBeTruthy();
    expect(view.getByLabelText("Trip length, 5 days")).toBeTruthy();
  });

  it("calls the delete handler when the delete row is pressed", () => {
    const onDeleteTrip = jest.fn();
    const trip = buildTrip();
    const { getByText } = render(
      <TripFormSheet
        visible
        mode="edit"
        trip={trip}
        canDeleteTrip
        onClose={jest.fn()}
        onDeleteTrip={onDeleteTrip}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByText("Delete trip"));

    expect(onDeleteTrip).toHaveBeenCalledTimes(1);
  });

  it("opens the destination picker sheet from the destination row", () => {
    const { getByLabelText, getByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByLabelText("Choose destination"));

    expect(getByText("Where are you going?")).toBeTruthy();
    expect(getByText("Popular destinations")).toBeTruthy();
    expect(getByText("Lisbon, Portugal")).toBeTruthy();
  });

  it("renders destination search results after the debounced query", async () => {
    mockSearchPlaces.mockResolvedValue([
      {
        id: "rome-it",
        label: "Rome, Lazio, Italy",
        city: "Rome",
        region: "Lazio",
        country: "Italy",
        country_code: "IT",
      },
      {
        id: "rome-us",
        label: "Rome, Georgia, United States",
        city: "Rome",
        region: "Georgia",
        country: "United States",
        country_code: "US",
      },
    ]);

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByLabelText("Choose destination"));
    fireEvent.changeText(
      getByPlaceholderText("Search a city, region, landmark, or airport"),
      "Rome",
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText("Rome, Lazio, Italy")).toBeTruthy();
      expect(getByText("Rome, Georgia, United States")).toBeTruthy();
    });
  });

  it("selects a result, closes the sheet, and updates the main form row", async () => {
    mockSearchPlaces.mockResolvedValue([
      {
        id: "paris-fr",
        displayName: "Paris, France",
        name: "Paris",
        country: "France",
        countryCode: "FR",
        source: "nominatim",
      },
    ]);

    const { getByLabelText, getByPlaceholderText, getByText, queryByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByLabelText("Choose destination"));
    fireEvent.changeText(
      getByPlaceholderText("Search a city, region, landmark, or airport"),
      "Paris",
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(getByText("Paris, France")).toBeTruthy());
    fireEvent.press(getByText("Paris, France"));

    expect(queryByText("Where are you going?")).toBeNull();
    expect(getByText("Paris, France")).toBeTruthy();
    expect(getByText("Change")).toBeTruthy();
  });

  it("shows fallback destinations when provider search fails", async () => {
    mockSearchPlaces.mockRejectedValue(new Error("provider unavailable"));

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.press(getByLabelText("Choose destination"));
    fireEvent.changeText(
      getByPlaceholderText("Search a city, region, landmark, or airport"),
      "Italy",
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText("Couldn't search destinations. Try again.")).toBeTruthy();
      expect(getByText("Try one of these")).toBeTruthy();
      expect(getByText("Rome, Italy")).toBeTruthy();
    });
  });

  it("does not accept raw typed destination text as the selected destination", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(view.getByPlaceholderText("e.g. Summer in Rome"), "My trip");
    chooseVisibleDateRange(view, "April 10, 2026", "April 15, 2026");
    fireEvent.press(view.getByLabelText("Choose destination"));
    fireEvent.changeText(
      view.getByPlaceholderText("Search a city, region, landmark, or airport"),
      "Atlantis",
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    fireEvent.press(view.getAllByText("Create trip")[1]!);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      view.getByText(
        "Choose a destination from the search results so Waypoint knows where to build your trip.",
      ),
    ).toBeTruthy();
  });

  it("submits the selected destination display name and auto-fills an empty title", async () => {
    mockSearchPlaces.mockResolvedValue([
      {
        id: "rome-it",
        label: "Rome, Lazio, Italy",
        city: "Rome",
        region: "Lazio",
        country: "Italy",
        country_code: "IT",
      },
    ]);
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <TripFormSheet
        visible
        mode="create"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(view.getByLabelText("Choose destination"));
    fireEvent.changeText(
      view.getByPlaceholderText("Search a city, region, landmark, or airport"),
      "Rome",
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(view.getByText("Rome, Lazio, Italy")).toBeTruthy());
    fireEvent.press(view.getByText("Rome, Lazio, Italy"));
    chooseVisibleDateRange(view, "April 10, 2026", "April 15, 2026");
    fireEvent.press(view.getAllByText("Create trip")[1]!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]![0];
    expect(submitted.start_date).toBe("2026-04-10");
    expect(submitted.end_date).toBe("2026-04-15");
    expect(submitted.title).toBe("Rome · Apr 10–15");
    expect(buildCreateTripPayload(submitted).destination).toBe("Rome, Lazio, Italy");
    expect(buildCreateTripPayload(submitted).start_date).toBe("2026-04-10");
    expect(buildCreateTripPayload(submitted).end_date).toBe("2026-04-15");
  });
});

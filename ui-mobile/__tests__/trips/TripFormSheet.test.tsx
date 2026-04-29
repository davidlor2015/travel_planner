import { fireEvent, render } from "@testing-library/react-native";

import { TripFormSheet } from "@/features/trips/TripFormSheet";
import type { TripResponse } from "@/features/trips/types";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/features/trips/api", () => ({
  searchPlaces: jest.fn().mockResolvedValue([]),
}));

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
  it("renders the add trip flow with core fields and actions", () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(
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
    expect(getAllByText("Budget").length).toBeGreaterThan(0);
    expect(getByText("Pace")).toBeTruthy();
    expect(getByText("Interests")).toBeTruthy();
    expect(getByPlaceholderText("e.g. Summer in Rome")).toBeTruthy();
    expect(getByPlaceholderText("e.g. Rome, Italy")).toBeTruthy();
    expect(getByPlaceholderText("2026-07-10")).toBeTruthy();
    expect(getByPlaceholderText("2026-07-16")).toBeTruthy();
  });

  it("renders the edit trip flow with notes and save action", () => {
    const trip = buildTrip();
    const { getByDisplayValue, getByPlaceholderText, getByText } = render(
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
    expect(getByDisplayValue("Kyoto, Japan")).toBeTruthy();
    expect(getByDisplayValue("2026-10-10")).toBeTruthy();
    expect(getByDisplayValue("2026-10-15")).toBeTruthy();
    expect(getByDisplayValue("Slow mornings and temple walks")).toBeTruthy();
    expect(getByPlaceholderText("Pace, budget, interests, reminders")).toBeTruthy();
    expect(getByText("Delete trip")).toBeTruthy();
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
});

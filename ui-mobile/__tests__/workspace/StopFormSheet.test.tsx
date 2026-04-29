// Path: ui-mobile/__tests__/workspace/StopFormSheet.test.tsx
// Summary: Covers automated tests for StopFormSheet.test behavior.

import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { StopFormSheet } from "@/features/trips/workspace/StopFormSheet";
import { buildTimeOptions } from "@/features/trips/workspace/itineraryDraftMutations";
import type { ItineraryItem } from "@/features/ai/api";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const dayOptions = [
  { label: "Day 1 · Apr 21 · Tue", value: 0 },
  { label: "Day 2 · Apr 22 · Wed", value: 1 },
];

const moveAvailability = {
  canMoveUp: false,
  canMoveDown: false,
  canMoveToPreviousDay: false,
  canMoveToNextDay: false,
};

function item(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 1,
    time: "8:00 AM",
    title: "Coffee",
    location: "Cafe",
    lat: null,
    lon: null,
    notes: null,
    cost_estimate: null,
    status: "planned",
    handled_by: null,
    booked_by: null,
    ...overrides,
  };
}

describe("StopFormSheet", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("requires a title before saving", () => {
    const onSave = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <StopFormSheet
        visible
        item={null}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={onSave}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Stop title"), "   ");
    fireEvent.press(getByText("Save stop"));

    expect(getByText("Add a stop title.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves selected day and trip-local time values", () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText, getByPlaceholderText } = render(
      <StopFormSheet
        visible
        item={null}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={onSave}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Stop title"), "Dinner");
    fireEvent.changeText(getByPlaceholderText("Search or type a location"), "Night market");
    fireEvent.press(getByLabelText("Choose itinerary day"));
    fireEvent.press(getByText("Day 2 · Apr 22 · Wed"));
    fireEvent.press(getByLabelText("Choose stop time"));
    fireEvent.press(getByText("8:00 AM"));
    fireEvent.press(getByText("Save stop"));

    expect(onSave).toHaveBeenCalledWith({
      dayIndex: 1,
      time: "8:00 AM",
      title: "Dinner",
      location: "Night market",
      notes: null,
    });
  });

  it("saves No time as null", () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText, getByPlaceholderText } = render(
      <StopFormSheet
        visible
        item={item()}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={onSave}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Stop title"), "Coffee");
    fireEvent.press(getByLabelText("Choose stop time"));
    fireEvent.press(getByText("No time"));
    fireEvent.press(getByText("Save stop"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: null }));
  });

  it("keeps day and time option lists collapsed until selected", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <StopFormSheet
        visible
        item={null}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByText("Day 1 · Apr 21 · Tue")).toBeTruthy();
    expect(getByText("No time")).toBeTruthy();
    expect(queryByText("Day 2 · Apr 22 · Wed")).toBeNull();
    expect(queryByText("8:00 AM")).toBeNull();

    fireEvent.press(getByLabelText("Choose itinerary day"));
    expect(getByText("Day 2 · Apr 22 · Wed")).toBeTruthy();

    fireEvent.press(getByLabelText("Choose stop time"));
    expect(getByText("8:00 AM")).toBeTruthy();
  });

  it("calls onClose when cancel is pressed", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <StopFormSheet
        visible
        item={item()}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens delete confirmation and deletes after confirm", () => {
    const onDelete = jest.fn();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const { getByLabelText } = render(
      <StopFormSheet
        visible
        item={item()}
        initialDayIndex={0}
        dayOptions={dayOptions}
        timeOptions={buildTimeOptions(30)}
        moveAvailability={moveAvailability}
        onSave={jest.fn()}
        onDelete={onDelete}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
        onMoveToPreviousDay={jest.fn()}
        onMoveToNextDay={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText("Delete stop"));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    const destructive = buttons.find((button) => button.text === "Delete");

    destructive?.onPress?.();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

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

jest.mock("@react-native-community/datetimepicker");


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
    fireEvent.press(getByLabelText("Stop time picker"));
    fireEvent.press(getByText("Confirm time"));
    fireEvent.press(getByText("Save stop"));

    expect(onSave).toHaveBeenCalledWith({
      dayIndex: 1,
      time: "2:30 PM",
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

  it("keeps day list and time picker collapsed until selected", () => {
    const { getByLabelText, getByText, queryByLabelText, queryByText } = render(
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
    expect(queryByLabelText("Stop time picker")).toBeNull();

    fireEvent.press(getByLabelText("Choose itinerary day"));
    expect(getByText("Day 2 · Apr 22 · Wed")).toBeTruthy();

    fireEvent.press(getByLabelText("Choose stop time"));
    expect(getByLabelText("Stop time picker")).toBeTruthy();
  });

  it("opens the time picker when the visible time field is pressed", () => {
    const { getByLabelText, getByText, queryByLabelText } = render(
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

    expect(queryByLabelText("Stop time picker")).toBeNull();

    fireEvent.press(getByLabelText("Choose stop time"));

    expect(getByLabelText("Stop time picker")).toBeTruthy();
    expect(getByText("Confirm time")).toBeTruthy();
  });

  it("updates the visible time after selecting and confirming a picker value", () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText, getByPlaceholderText, queryByLabelText } = render(
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
    fireEvent.press(getByLabelText("Choose stop time"));
    fireEvent.press(getByLabelText("Stop time picker"));
    fireEvent.press(getByText("Confirm time"));

    expect(queryByLabelText("Stop time picker")).toBeNull();
    expect(getByText("2:30 PM")).toBeTruthy();

    fireEvent.press(getByText("Save stop"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: "2:30 PM" }));
  });

  it("keeps the previous time when the picker is cancelled", () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText, getByPlaceholderText, queryByLabelText } = render(
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
    fireEvent.press(getByLabelText("Stop time picker"));
    fireEvent.press(getByLabelText("Dismiss time picker"));

    expect(queryByLabelText("Stop time picker")).toBeNull();
    expect(getByText("8:00 AM")).toBeTruthy();

    fireEvent.press(getByText("Save stop"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: "8:00 AM" }));
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

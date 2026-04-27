// Path: ui-mobile/__tests__/workspace/StopFormSheet.test.tsx
// Summary: Covers automated tests for StopFormSheet.test behavior.

import { fireEvent, render } from "@testing-library/react-native";

import { StopFormSheet } from "@/features/trips/workspace/StopFormSheet";
import { buildTimeOptions } from "@/features/trips/workspace/itineraryDraftMutations";
import type { ItineraryItem } from "@/features/ai/api";

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
  it("requires a title before saving", () => {
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
    fireEvent.changeText(getByPlaceholderText("Location"), "Night market");
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
});

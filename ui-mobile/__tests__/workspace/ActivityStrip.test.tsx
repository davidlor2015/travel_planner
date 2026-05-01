import { fireEvent, render } from "@testing-library/react-native";

import type { TripActivityItem } from "@/features/trips/types";
import { ActivityStrip } from "@/features/trips/workspace/ActivityStrip";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const items: TripActivityItem[] = [
  {
    id: "1",
    actorName: "David",
    actionLabel: "confirmed",
    entityLabel: "Colosseum Guided Tour",
    createdAt: "2026-04-29T20:00:00Z",
    category: "execution",
  },
];

describe("ActivityStrip", () => {
  it("shows empty state when no activities exist", () => {
    const { getByText } = render(
      <ActivityStrip items={[]} unseenCount={0} onPress={jest.fn()} />,
    );
    expect(getByText("No recent changes yet.")).toBeTruthy();
  });

  it("shows recent snippets and opens sheet callback", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ActivityStrip items={items} unseenCount={3} onPress={onPress} />,
    );
    expect(getByText("3 changes since you last opened")).toBeTruthy();
    expect(getByText("David confirmed Colosseum Guided Tour")).toBeTruthy();
    fireEvent.press(getByText("What changed"));
    expect(onPress).toHaveBeenCalled();
  });
});

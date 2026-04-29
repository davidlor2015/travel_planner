import { render } from "@testing-library/react-native";

import { ActivitySheet } from "@/features/trips/workspace/ActivitySheet";

describe("ActivitySheet", () => {
  it("renders actor/action/entity with friendly timestamp", () => {
    const { getByText } = render(
      <ActivitySheet
        visible
        onClose={jest.fn()}
        items={[
          {
            id: "a1",
            actorName: "David",
            actionLabel: "confirmed",
            entityLabel: "Colosseum Guided Tour",
            createdAt: new Date().toISOString(),
            category: "execution",
          },
        ]}
      />,
    );

    expect(getByText("David confirmed Colosseum Guided Tour")).toBeTruthy();
    expect(getByText(/Just now|m ago/)).toBeTruthy();
  });
});

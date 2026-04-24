import { Pressable, ScrollView, Text } from "react-native";

export type WorkspaceTab = "overview" | "budget" | "packing" | "reservations";

const TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "budget", label: "Budget" },
  { key: "packing", label: "Packing" },
  { key: "reservations", label: "Bookings" },
];

type Props = {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
};

export function WorkspaceTabs({ activeTab, onTabChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerClassName="flex-row gap-2 px-4 pb-1"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            className={[
              "rounded-full border px-4 py-2.5",
              isActive
                ? "border-text bg-text"
                : "border-border bg-white",
            ].join(" ")}
            onPress={() => onTabChange(tab.key)}
          >
            <Text
              className={[
                "text-sm font-medium",
                isActive ? "text-white" : "text-text-muted",
              ].join(" ")}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

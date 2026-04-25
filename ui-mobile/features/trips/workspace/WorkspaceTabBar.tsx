import { Pressable, ScrollView, Text, View } from "react-native";

export type WorkspaceTab =
  | "overview"
  | "itinerary"
  | "bookings"
  | "budget"
  | "packing"
  | "members"
  | "map";

interface WorkspaceTabBarProps {
  visibleTabs: { key: WorkspaceTab; label: string }[];
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  bookingsBadge?: number;
  membersBadge?: number;
}

export function WorkspaceTabBar({
  visibleTabs,
  activeTab,
  onTabChange,
  bookingsBadge = 0,
  membersBadge = 0,
}: WorkspaceTabBarProps) {
  const badges: Partial<Record<WorkspaceTab, number>> = {
    bookings: bookingsBadge,
    members: membersBadge,
  };

  return (
    <View className="border-b border-smoke bg-ivory">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const badge = badges[tab.key] ?? 0;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className="relative mr-5 flex-row items-center gap-1.5 py-3"
            >
              <Text
                className={
                  isActive
                    ? "text-[13px] font-semibold text-espresso"
                    : "text-[13px] font-medium text-muted"
                }
              >
                {tab.label}
              </Text>
              {badge > 0 && (
                <View
                  className={[
                    "min-h-[17px] min-w-[17px] items-center justify-center rounded-full px-1",
                    isActive ? "bg-espresso/10" : "bg-smoke",
                  ].join(" ")}
                >
                  <Text
                    className={[
                      "text-[10px] font-semibold leading-none",
                      isActive ? "text-espresso" : "text-flint",
                    ].join(" ")}
                  >
                    {badge}
                  </Text>
                </View>
              )}
              {isActive && (
                <View className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-amber" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

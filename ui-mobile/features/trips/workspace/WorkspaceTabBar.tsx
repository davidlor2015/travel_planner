// Path: ui-mobile/features/trips/workspace/WorkspaceTabBar.tsx
// Summary: Implements WorkspaceTabBar module logic.

import { Pressable, ScrollView, Text, View } from "react-native";

import { DE } from "@/shared/theme/desertEditorial";
import { fontStyles } from "@/shared/theme/typography";

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
    <View style={{ backgroundColor: DE.ivory, borderBottomWidth: 1, borderBottomColor: DE.rule }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4 }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const badge = badges[tab.key] ?? 0;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className="relative mr-[18px] flex-row items-center gap-1.5 py-3.5"
            >
              <Text
                style={[
                  isActive ? fontStyles.uiBold : fontStyles.uiMedium,
                  { fontSize: 13.5, color: isActive ? DE.ink : DE.muted },
                ]}
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
                <View
                  className="absolute bottom-[-1px] left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: DE.clay }}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

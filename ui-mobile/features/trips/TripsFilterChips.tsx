import { Pressable, ScrollView, Text } from "react-native";

import { fontStyles } from "@/shared/theme/typography";
import type { TripsFilter } from "./useTripsListModel";

const FILTERS: { id: TripsFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "drafts", label: "Drafts" },
];

type Props = {
  active: TripsFilter;
  onChange: (f: TripsFilter) => void;
};

export function TripsFilterChips({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-6"
      contentContainerStyle={{ gap: 8 }}
    >
      {FILTERS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="button"
            className="active:opacity-75"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 100,
              backgroundColor: isActive ? "#231910" : "transparent",
              borderWidth: 1,
              borderColor: isActive ? "#231910" : "#D4C7B1",
            }}
          >
            <Text
              style={[
                fontStyles.uiMedium,
                {
                  fontSize: 12,
                  color: isActive ? "#FEFCF9" : "#3D2E22",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

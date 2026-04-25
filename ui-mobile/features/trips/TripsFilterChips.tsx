import { Pressable, ScrollView, Text } from "react-native";

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
      className="px-4"
      contentContainerStyle={{ gap: 8 }}
    >
      {FILTERS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            className={[
              "rounded-full border px-4 py-2 active:opacity-75",
              isActive ? "border-espresso bg-espresso" : "border-border bg-surface",
            ].join(" ")}
          >
            <Text
              className={[
                "text-[13px] font-semibold",
                isActive ? "text-ivory" : "text-text-muted",
              ].join(" ")}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

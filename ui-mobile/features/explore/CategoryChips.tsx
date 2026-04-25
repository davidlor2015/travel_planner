import { Pressable, ScrollView, Text } from "react-native";

import type { DestinationMood } from "./types";

type Props = {
  moods: DestinationMood[];
  activeMood: DestinationMood | null;
  onSelectMood: (mood: DestinationMood | null) => void;
};

export function CategoryChips({ moods, activeMood, onSelectMood }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ gap: 8 }}
    >
      <Chip
        label="All"
        active={activeMood === null}
        onPress={() => onSelectMood(null)}
      />
      {moods.map((mood) => (
        <Chip
          key={mood}
          label={mood}
          active={activeMood === mood}
          onPress={() => onSelectMood(activeMood === mood ? null : mood)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        "rounded-full border px-4 py-2 active:opacity-75",
        active ? "border-amber bg-amber" : "border-border bg-surface",
      ].join(" ")}
    >
      <Text
        className={[
          "text-[13px] font-semibold",
          active ? "text-white" : "text-text-muted",
        ].join(" ")}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

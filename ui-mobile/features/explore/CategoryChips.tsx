// Path: ui-mobile/features/explore/CategoryChips.tsx
// Summary: Implements CategoryChips module logic.

import { Pressable, ScrollView, Text } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import type { DestinationTheme } from "./types";

type Props = {
  themes: DestinationTheme[];
  activeTheme: DestinationTheme | null;
  onSelectTheme: (theme: DestinationTheme | null) => void;
};

export function CategoryChips({ themes, activeTheme, onSelectTheme }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ gap: 8 }}
    >
      <Chip
        label="All"
        active={activeTheme === null}
        onPress={() => onSelectTheme(null)}
      />
      {themes.map((theme) => (
        <Chip
          key={theme}
          label={theme}
          active={activeTheme === theme}
          onPress={() => onSelectTheme(activeTheme === theme ? null : theme)}
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
        className={["text-[13px]", active ? "text-white" : "text-text-muted"].join(" ")}
        style={fontStyles.uiSemibold}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

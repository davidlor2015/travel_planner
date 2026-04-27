// Path: ui-mobile/features/explore/ExploreHeader.tsx
// Summary: Implements ExploreHeader module logic.

import { Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

export function ExploreHeader() {
  return (
    <View className="gap-2 px-4 pb-2 pt-5">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
        Explore
      </Text>
      <Text
        className="text-[32px] leading-[38px] text-text"
        style={fontStyles.displaySemibold}
      >
        Wander, gently.
      </Text>
      <Text className="text-[14px] leading-[22px] text-text-muted">
        Hand-picked destinations to plant ideas for next time.
      </Text>
    </View>
  );
}

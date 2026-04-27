import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExploreScreen } from "@/features/explore/ExploreScreen";
import { fontStyles } from "@/shared/theme/typography";

const isExploreEnabled = process.env.EXPO_PUBLIC_ENABLE_EXPLORE === "true";

/**
 * Explore is gated behind EXPO_PUBLIC_ENABLE_EXPLORE=true (mirrors VITE_ENABLE_EXPLORE on web).
 * Tab visibility is controlled in _layout.tsx; this screen handles the disabled state gracefully.
 */
export default function ExplorePage() {
  if (!isExploreEnabled) {
    return <ExploreComingSoon />;
  }
  return <ExploreScreen />;
}

function ExploreComingSoon() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-5 px-8">
        <Text
          className="text-[11px] uppercase tracking-[0.16em] text-amber"
          style={fontStyles.uiSemibold}
        >
          Explore
        </Text>
        <Text
          className="text-center text-[28px] leading-[34px] text-text"
          style={fontStyles.displaySemibold}
        >
          Something wonderful{"\n"}is coming.
        </Text>
        <Text
          className="text-center text-[14px] leading-[22px] text-text-muted"
          style={fontStyles.uiRegular}
        >
          Curated destinations and travel inspiration — arriving soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

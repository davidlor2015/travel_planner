import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";

/**
 * Explore is gated behind EXPO_PUBLIC_ENABLE_EXPLORE=true (mirrors VITE_ENABLE_EXPLORE on web).
 * Hidden from the tab bar by default via _layout.tsx.
 */
export default function ExplorePage() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-1 gap-6 px-4 py-3">
        <ScreenHeader title="Explore" subtitle="Browse destinations and travel inspiration." />
        <EmptyState
          title="Explore is not enabled"
          message="Set EXPO_PUBLIC_ENABLE_EXPLORE=true to activate this feature."
        />
      </View>
    </SafeAreaView>
  );
}

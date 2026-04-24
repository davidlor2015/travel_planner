import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/shared/ui/EmptyState";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";

export default function CompanionsPage() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-1 gap-6 px-4 py-3">
        <ScreenHeader
          title="Companions"
          subtitle="Find and connect with compatible travel companions."
        />
        <EmptyState
          title="Companions is coming soon"
          message="Match with compatible travelers, view shared interests, and plan trips together. Check back soon."
        />
      </View>
    </SafeAreaView>
  );
}

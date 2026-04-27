import { ActivityIndicator, Text, View } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

export function ScreenLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator size="small" color="#B86845" />
      <Text className="text-sm text-text-muted" style={fontStyles.uiRegular}>
        {label}
      </Text>
    </View>
  );
}

import { Text, View } from "react-native";
import { Tabs, useLocalSearchParams } from "expo-router";

import { StopDetailScreen } from "@/features/trips/onTrip/StopDetailScreen";
import { fontStyles } from "@/shared/theme/typography";

function parseTripId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function StopDetailPage() {
  const { tripId: tripIdParam, stopKey: stopKeyParam } = useLocalSearchParams<{
    tripId?: string | string[];
    stopKey?: string | string[];
  }>();

  const tripId = parseTripId(tripIdParam);
  const stopKey = Array.isArray(stopKeyParam) ? stopKeyParam[0] : stopKeyParam;

  if (tripId === null || !stopKey) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-ontrip px-6">
        <Text
          className="text-center text-sm text-ontrip-muted"
          style={fontStyles.uiRegular}
        >
          We could not open that stop.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
      <StopDetailScreen tripId={tripId} stopKey={stopKey} />
    </>
  );
}

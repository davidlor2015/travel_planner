import { Text, View } from "react-native";
import { Tabs, useLocalSearchParams } from "expo-router";

import { WorkspaceScreen } from "@/features/trips/workspace/WorkspaceScreen";

function parseTripId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function TripDetailPage() {
  const params = useLocalSearchParams<{
    tripId?: string | string[];
    from?: string | string[];
  }>();
  const tripId = parseTripId(params.tripId);
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  if (tripId === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-red-700">Invalid trip.</Text>
      </View>
    );
  }

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
      <WorkspaceScreen
        tripId={tripId}
        autoStartFromCreate={from === "create"}
      />
    </>
  );
}

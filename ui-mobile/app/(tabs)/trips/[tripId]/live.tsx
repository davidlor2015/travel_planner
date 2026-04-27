import { Text, View } from "react-native";
import { Tabs, useLocalSearchParams } from "expo-router";

import { useTripDetailQuery } from "@/features/trips/hooks";
import { OnTripScreen } from "@/features/trips/onTrip/OnTripScreen";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { fontStyles } from "@/shared/theme/typography";

function parseTripId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function LiveViewPage() {
  const { tripId: tripIdParam } = useLocalSearchParams<{
    tripId?: string | string[];
  }>();
  const tripId = parseTripId(tripIdParam);

  const tripQuery = useTripDetailQuery(tripId);
  const title = tripQuery.data?.title ?? "Trip";
  const destination = tripQuery.data?.destination ?? "";
  const members = tripQuery.data?.members ?? [];

  if (tripId === null) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text
          className="text-center text-sm text-text-muted"
          style={fontStyles.uiRegular}
        >
          We could not open that trip.
        </Text>
      </View>
    );
  }

  if (tripQuery.isLoading) {
    return <ScreenLoading label="Loading your trip…" />;
  }

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
      <OnTripScreen tripId={tripId} tripTitle={title} tripDestination={destination} members={members} />
    </>
  );
}

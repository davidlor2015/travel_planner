import { useLocalSearchParams } from "expo-router";

import { useTripDetailQuery } from "@/features/trips/hooks";
import { OnTripScreen } from "@/features/trips/onTrip/OnTripScreen";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

export default function LiveViewPage() {
  const { tripId: tripIdParam } = useLocalSearchParams<{ tripId: string }>();
  const tripId = parseInt(tripIdParam ?? "0", 10);

  const tripQuery = useTripDetailQuery(tripId);
  const title = tripQuery.data?.title ?? "Trip";

  if (tripQuery.isLoading) {
    return <ScreenLoading label="Loading your trip…" />;
  }

  return <OnTripScreen tripId={tripId} tripTitle={title} />;
}

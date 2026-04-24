import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTripsQuery } from "@/features/trips/hooks";
import { OnTripScreen } from "@/features/trips/onTrip/OnTripScreen";
import { getTripStatus } from "@/features/trips/workspace/adapters";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

export default function ActivePage() {
  const tripsQuery = useTripsQuery();

  if (tripsQuery.isLoading) {
    return <ScreenLoading />;
  }

  if (tripsQuery.isError) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center gap-2 bg-[#111827] p-6"
        edges={["top"]}
      >
        <Text className="text-center text-[#ef9a9a]">
          Could not load trips.
        </Text>
      </SafeAreaView>
    );
  }

  const trips = tripsQuery.data ?? [];
  const activeTrip = trips.find(
    (t) => getTripStatus(t.start_date, t.end_date) === "active",
  );

  if (!activeTrip) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center gap-2 bg-[#111827] p-6"
        edges={["top"]}
      >
        <Text className="text-lg font-semibold text-white">No active trip</Text>
        <Text className="text-center text-sm text-white/50">
          Your on-trip view appears here while a trip is in progress.
        </Text>
      </SafeAreaView>
    );
  }

  return <OnTripScreen tripId={activeTrip.id} tripTitle={activeTrip.title} />;
}

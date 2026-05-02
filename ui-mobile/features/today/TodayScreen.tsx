// Path: ui-mobile/features/today/TodayScreen.tsx
// Summary: Implements TodayScreen module logic.

import { OnTripScreen } from "@/features/trips/onTrip/OnTripScreen";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { TodayEmptyState } from "./TodayEmptyState";
import { useTodayModel } from "./useTodayModel";

export function TodayScreen() {
  const { isLoading, activeTrip, nextUpcomingTrip, daysUntilNextTrip } =
    useTodayModel();

  if (isLoading) return <ScreenLoading label="Loading…" />;

  if (activeTrip) {
    return (
      <OnTripScreen
        tripId={activeTrip.id}
        tripTitle={activeTrip.title}
        tripDestination={activeTrip.destination}
        tripStartDate={activeTrip.start_date}
        members={activeTrip.members}
      />
    );
  }

  return (
    <TodayEmptyState
      nextUpcomingTrip={nextUpcomingTrip}
      daysUntilNextTrip={daysUntilNextTrip}
    />
  );
}

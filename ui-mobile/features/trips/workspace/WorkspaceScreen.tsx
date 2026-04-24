import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { TripFormSheet, type TripFormValue } from "@/features/trips/TripFormSheet";
import { TripSwitcherSheet } from "@/features/trips/TripSwitcherSheet";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { OverviewTab } from "./OverviewTab";
import { WorkspaceToolsSheet } from "./WorkspaceToolsSheet";
import { WorkspaceTripHeader } from "./WorkspaceTripHeader";
import { useTripWorkspaceModel } from "./useTripWorkspaceModel";

type Props = { tripId: number };

export function WorkspaceScreen({ tripId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const workspace = useTripWorkspaceModel({
    tripId,
    currentUserEmail: user?.email ?? "",
  });

  if (workspace.tripQuery.isLoading) {
    return <ScreenLoading />;
  }

  if (workspace.tripQuery.isError) {
    return (
      <ScreenError
        message={workspace.isNotFound ? "Trip not found." : "Could not load trip."}
        onRetry={workspace.isNotFound ? undefined : () => void workspace.tripQuery.refetch()}
      />
    );
  }

  const tripData = workspace.tripRaw;
  const trip = workspace.trip;
  const collaboration = workspace.collaboration;
  if (!collaboration) return null;
  if (!tripData || !trip) return null;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <WorkspaceTripHeader
        trip={trip}
        summary={workspace.summary}
        onTripPress={() => setSwitcherOpen(true)}
        onOpenToolsPress={() => setToolsOpen(true)}
        onEditPress={() => setEditOpen(true)}
      />

      <OverviewTab
        tripId={tripId}
        trip={trip}
        summary={workspace.summary}
        collaboration={collaboration}
        showGroupCoordination={workspace.showGroupCoordination}
        memberReadinessError={workspace.memberReadinessError}
        invitePending={workspace.invitePending}
        onInvite={workspace.onInvite}
      />

      <TripSwitcherSheet
        visible={switcherOpen}
        trips={workspace.switcherTrips}
        activeTripId={tripId}
        onClose={() => setSwitcherOpen(false)}
        onSelect={(nextTripId) => router.replace(`/(tabs)/trips/${nextTripId}`)}
      />

      <WorkspaceToolsSheet
        tripId={tripId}
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
      />

      <TripFormSheet
        visible={editOpen}
        mode="edit"
        trip={tripData}
        submitting={workspace.isUpdatingTrip}
        error={editError}
        onClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          try {
            setEditError(null);
            await workspace.updateTrip(value);
            setEditOpen(false);
          } catch (error) {
            setEditError(error instanceof Error ? error.message : "Could not update trip.");
          }
        }}
      />
    </SafeAreaView>
  );
}

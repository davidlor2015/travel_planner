import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TripFormSheet,
  buildTripUpdatePayload,
  type TripFormValue,
} from "@/features/trips/TripFormSheet";
import { TripSwitcherSheet } from "@/features/trips/TripSwitcherSheet";
import { toTripListItem } from "@/features/trips/adapters";
import {
  useTripDetailQuery,
  useTripsQuery,
  useTripSummariesQuery,
  useUpdateTripMutation,
} from "@/features/trips/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError } from "@/shared/api/client";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";

import { BudgetTab } from "./BudgetTab";
import { OverviewTab } from "./OverviewTab";
import { PackingTab } from "./PackingTab";
import { ReservationsTab } from "./ReservationsTab";
import { WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import { WorkspaceTripHeader } from "./WorkspaceTripHeader";
import { toTripSummaryViewModel, toTripWorkspaceViewModel } from "./adapters";

type Props = { tripId: number };

export function WorkspaceScreen({ tripId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const tripQuery = useTripDetailQuery(tripId);
  const tripsQuery = useTripsQuery();
  const summariesQuery = useTripSummariesQuery();
  const updateTripMutation = useUpdateTripMutation();

  if (tripQuery.isLoading) {
    return <ScreenLoading />;
  }

  if (tripQuery.isError) {
    const is404 =
      tripQuery.error instanceof ApiError && tripQuery.error.status === 404;
    return (
      <ScreenError
        message={is404 ? "Trip not found." : "Could not load trip."}
        onRetry={is404 ? undefined : () => void tripQuery.refetch()}
      />
    );
  }

  const tripData = tripQuery.data;
  if (!tripData) return null;

  const currentUserEmail = user?.email ?? "";
  const trip = toTripWorkspaceViewModel(tripData, currentUserEmail);

  const summaryRaw = summariesQuery.data?.find((s) => s.trip_id === tripId);
  const summary = summaryRaw ? toTripSummaryViewModel(summaryRaw) : null;
  const switcherTrips = (tripsQuery.data ?? []).map(toTripListItem);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <WorkspaceTripHeader
        trip={trip}
        summary={summary}
        onTripPress={() => setSwitcherOpen(true)}
        onEditPress={() => setEditOpen(true)}
      />

      <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <View className="flex-1">
        {activeTab === "overview" && (
          <OverviewTab tripId={tripId} trip={trip} summary={summary} />
        )}
        {activeTab === "budget" && <BudgetTab tripId={tripId} />}
        {activeTab === "packing" && <PackingTab tripId={tripId} />}
        {activeTab === "reservations" && <ReservationsTab tripId={tripId} />}
      </View>

      <TripSwitcherSheet
        visible={switcherOpen}
        trips={switcherTrips}
        activeTripId={tripId}
        onClose={() => setSwitcherOpen(false)}
        onSelect={(nextTripId) => router.replace(`/(tabs)/trips/${nextTripId}`)}
      />

      <TripFormSheet
        visible={editOpen}
        mode="edit"
        trip={tripData}
        submitting={updateTripMutation.isPending}
        error={editError}
        onClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          try {
            setEditError(null);
            await updateTripMutation.mutateAsync({
              tripId,
              data: buildTripUpdatePayload(value),
            });
            setEditOpen(false);
          } catch (error) {
            setEditError(error instanceof Error ? error.message : "Could not update trip.");
          }
        }}
      />
    </SafeAreaView>
  );
}

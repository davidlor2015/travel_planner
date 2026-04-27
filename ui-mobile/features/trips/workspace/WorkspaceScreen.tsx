// Path: ui-mobile/features/trips/workspace/WorkspaceScreen.tsx
// Summary: Implements WorkspaceScreen module logic.

import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSavedItineraryQuery } from "@/features/ai/hooks";
import { useStreamingItinerary } from "@/features/ai/useStreamingItinerary";
import { ApiError } from "@/shared/api/client";
import { TripFormSheet, type TripFormValue } from "@/features/trips/TripFormSheet";
import { TripSwitcherSheet } from "@/features/trips/TripSwitcherSheet";
import { useOnTripSnapshotQuery } from "@/features/trips/hooks";
import { canOpenOnTrip } from "@/features/trips/onTrip/eligibility";
import { useAuth } from "@/providers/AuthProvider";
import { ScreenError } from "@/shared/ui/ScreenError";
import { ScreenLoading } from "@/shared/ui/ScreenLoading";
import { fontStyles } from "@/shared/theme/typography";

import { BookingsTab } from "./BookingsTab";
import { BudgetTab } from "./BudgetTab";
import { MembersTab } from "./MembersTab";
import { MapTab } from "./MapTab";
import { OverviewTab } from "./OverviewTab";
import { PackingTab } from "./PackingTab";
import { WorkspaceTabBar, type WorkspaceTab } from "./WorkspaceTabBar";
import { WorkspaceTripHeader } from "./WorkspaceTripHeader";
import { isCollaborationActive } from "./helpers/collaborationGate";
import { useTripWorkspaceModel } from "./useTripWorkspaceModel";

const ENABLE_MAP = process.env.EXPO_PUBLIC_ENABLE_MAP === "true";

type Props = { tripId: number; autoStartFromCreate?: boolean };

export function WorkspaceScreen({ tripId, autoStartFromCreate = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [tripId]);

  const workspace = useTripWorkspaceModel({
    tripId,
    currentUserEmail: user?.email ?? "",
  });
  const tripData = workspace.tripRaw;
  const trip = workspace.trip;
  const collaboration = workspace.collaboration;
  const deleteCurrentTrip = workspace.deleteTrip;
  const isDeletingTrip = workspace.isDeletingTrip;
  const isSoloTrip = workspace.isSolo;

  const { streams, start, reset } = useStreamingItinerary();
  const streamState = streams[tripId];
  const handleStartStream = useCallback(() => { void start(tripId); }, [start, tripId]);
  const handleCancelStream = useCallback(() => reset(tripId), [reset, tripId]);

  const itineraryQuery = useSavedItineraryQuery(tripId);
  const onTripSnapshotQuery = useOnTripSnapshotQuery(tripId, {
    enabled: workspace.trip?.status === "active",
  });
  const canOpenLiveView = canOpenOnTrip(
    workspace.trip?.status ?? "upcoming",
    onTripSnapshotQuery.data ?? null,
  );

  const confirmDeleteTrip = useCallback(() => {
    if (!tripData || !trip?.isOwner || isDeletingTrip) return;

    Alert.alert(
      isSoloTrip ? "Delete trip?" : "Delete trip for everyone?",
      isSoloTrip
        ? "This permanently removes this trip, including its itinerary, budget, packing list, and reservations."
        : "This permanently removes the trip for all members, including its itinerary, budget, packing list, and reservations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete trip",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setEditError(null);
                await deleteCurrentTrip();
                setEditOpen(false);
                router.replace("/(tabs)/trips" as Href);
              } catch {
                setEditError("We couldn't delete the trip. Try again.");
              }
            })();
          },
        },
      ],
    );
  }, [
    router,
    deleteCurrentTrip,
    isDeletingTrip,
    isSoloTrip,
    trip?.isOwner,
    tripData,
  ]);

  // Mirror web's ?from=create: auto-start AI stream once when a freshly created
  // trip has no itinerary yet, so creation → draft is one uninterrupted arc.
  const autoStartFiredRef = useRef(false);
  const is404ForAutoStart =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    (itineraryQuery.error as ApiError).status === 404;

  useEffect(() => {
    if (!autoStartFromCreate)         return;
    if (autoStartFiredRef.current)    return;
    if (!is404ForAutoStart)           return;
    if (streamState?.streaming)       return;
    autoStartFiredRef.current = true;
    handleStartStream();
  }, [autoStartFromCreate, is404ForAutoStart, streamState?.streaming, handleStartStream]);

  const hasSavedItinerary = Boolean(
    itineraryQuery.data ||
      (itineraryQuery.isError &&
        itineraryQuery.error instanceof ApiError &&
        itineraryQuery.error.status !== 404),
  );

  const visibleTabs = useMemo<{ key: WorkspaceTab; label: string }[]>(() => {
    const rawTrip = workspace.tripRaw;
    const collaborationActive = rawTrip ? isCollaborationActive(rawTrip) : false;

    const tabs: { key: WorkspaceTab; label: string }[] = [
      { key: "overview", label: "Overview" },
    ];
    if (hasSavedItinerary) {
      tabs.push({ key: "itinerary", label: "Itinerary" });
      tabs.push({ key: "bookings", label: "Bookings" });
      tabs.push({ key: "budget", label: "Budget" });
      tabs.push({ key: "packing", label: "Packing" });
      if (ENABLE_MAP) {
        tabs.push({ key: "map", label: "Map" });
      }
    }
    if (workspace.showGroupCoordination) {
      tabs.push({ key: "members", label: "People" });
    }
    // Chat tab: only when collaboration active (>1 joined member), mirrors web collaborationGate
    if (collaborationActive) {
      // Chat tab not yet ported (web uses local storage); placeholder for future slice
    }
    return tabs;
  }, [hasSavedItinerary, workspace.showGroupCoordination, workspace.tripRaw]);

  // Keep activeTab valid when visible set changes
  const resolvedTab: WorkspaceTab = useMemo(
    () => (visibleTabs.some((t) => t.key === activeTab) ? activeTab : "overview"),
    [activeTab, visibleTabs],
  );

  if (workspace.tripQuery.isLoading) {
    return <ScreenLoading />;
  }

  if (workspace.tripQuery.isError) {
    return (
      <ScreenError
        message={
          workspace.isNotFound
            ? "We couldn't find that trip."
            : "We couldn't load this workspace. Try again in a moment."
        }
        onRetry={
          workspace.isNotFound ? undefined : () => void workspace.tripQuery.refetch()
        }
      />
    );
  }

  if (!collaboration || !tripData || !trip) return null;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <WorkspaceTripHeader
        trip={trip}
        onTripPress={() => setSwitcherOpen(true)}
        onCreatePress={() => setCreateOpen(true)}
        onEditPress={() => setEditOpen(true)}
        onMembersPress={() => setActiveTab("members")}
        showMembersButton={workspace.showGroupCoordination}
        compact={resolvedTab === "itinerary"}
      />

      {canOpenLiveView ? (
        <Pressable
          onPress={() => router.push(`/(tabs)/trips/${tripId}/live` as Href)}
          className="mx-4 mt-3 flex-row items-center justify-between rounded-2xl border border-border-ontrip-strong bg-surface-ontrip-raised px-4 py-3 active:opacity-75"
        >
          <View>
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-accent-ontrip" />
              <Text className="text-sm text-ontrip" style={fontStyles.uiSemibold}>
                Trip in progress
              </Text>
            </View>
            <Text className="mt-0.5 text-xs text-ontrip-muted" style={fontStyles.uiRegular}>
              Today: stops, status updates, and unplanned moments.
            </Text>
          </View>
          <Text className="ml-3 text-sm text-accent-ontrip" style={fontStyles.uiSemibold}>
            Live →
          </Text>
        </Pressable>
      ) : null}

      <WorkspaceTabBar
        visibleTabs={visibleTabs}
        activeTab={resolvedTab}
        onTabChange={setActiveTab}
      />

      {(resolvedTab === "overview" || resolvedTab === "itinerary") && (
        <OverviewTab
          trip={trip}
          summary={workspace.summary}
          collaboration={collaboration}
          onTripSnapshot={onTripSnapshotQuery.data ?? null}
          canOpenLiveView={canOpenLiveView}
          streamState={streamState}
          onStartStream={handleStartStream}
          onCancelStream={handleCancelStream}
          onOpenTab={setActiveTab}
          onOpenLiveView={() => router.push(`/(tabs)/trips/${tripId}/live` as Href)}
          showItineraryOnly={resolvedTab === "itinerary"}
        />
      )}
      {resolvedTab === "bookings" && <BookingsTab tripId={tripId} />}
      {resolvedTab === "budget" && <BudgetTab tripId={tripId} />}
      {resolvedTab === "packing" && <PackingTab tripId={tripId} />}
      {resolvedTab === "map" && <MapTab tripId={tripId} />}
      {resolvedTab === "members" && (
        <MembersTab
          trip={trip}
          collaboration={collaboration}
          invitePending={workspace.invitePending}
          onInvite={workspace.onInvite}
          memberReadinessError={workspace.memberReadinessError}
        />
      )}

      <TripSwitcherSheet
        visible={switcherOpen}
        trips={workspace.switcherTrips}
        activeTripId={tripId}
        onClose={() => setSwitcherOpen(false)}
        onSelect={(nextTripId) =>
          router.replace(`/(tabs)/trips/${nextTripId}` as Href)
        }
      />

      <TripFormSheet
        visible={createOpen}
        mode="create"
        submitting={workspace.isCreatingTrip}
        error={createError}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          try {
            setCreateError(null);
            const created = await workspace.createTrip(value);
            setCreateOpen(false);
            router.push(`/(tabs)/trips/${created.id}?from=create` as Href);
          } catch {
            setCreateError("We couldn't create that trip. Try again.");
          }
        }}
      />

      <TripFormSheet
        visible={editOpen}
        mode="edit"
        trip={tripData}
        submitting={workspace.isUpdatingTrip}
        deleting={workspace.isDeletingTrip}
        error={editError}
        canDeleteTrip={trip.isOwner}
        onClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          try {
            setEditError(null);
            await workspace.updateTrip(value);
            setEditOpen(false);
          } catch {
            setEditError("We couldn't update the trip. Try again.");
          }
        }}
        onDeleteTrip={confirmDeleteTrip}
      />
    </SafeAreaView>
  );
}

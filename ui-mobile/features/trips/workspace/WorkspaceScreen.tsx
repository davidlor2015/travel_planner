// Path: ui-mobile/features/trips/workspace/WorkspaceScreen.tsx
// Summary: Implements WorkspaceScreen module logic.

import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
import { Button, SecondaryButton } from "@/shared/ui/Button";

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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [tripId]);

  const workspace = useTripWorkspaceModel({
    tripId,
    currentUserEmail: user?.email ?? "",
    currentUserId: user?.id ?? null,
    currentUserDisplayName: user?.display_name ?? null,
  });
  const tripData = workspace.tripRaw;
  const trip = workspace.trip;
  const collaboration = workspace.collaboration;
  const deleteCurrentTrip = workspace.deleteTrip;
  const isDeletingTrip = workspace.isDeletingTrip;
  const isSoloTrip = workspace.isSolo;
  const canDeleteTrip = trip?.isOwner ?? false;
  const isReadOnly = trip?.isReadOnly ?? false;

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

  const deleteConfirmTitle = isSoloTrip ? "Delete trip?" : "Delete trip for everyone?";
  const deleteConfirmDescription = isSoloTrip
    ? "This permanently removes this trip, including its itinerary, budget, packing list, and reservations."
    : "This permanently removes the trip for all members, including its itinerary, budget, packing list, and reservations.";

  const closeDeleteConfirm = useCallback(() => {
    if (isDeletingTrip) return;
    setDeleteConfirmOpen(false);
  }, [isDeletingTrip]);

  const confirmDeleteTrip = useCallback(() => {
    if (!canDeleteTrip || isDeletingTrip) return;
    setEditError(null);
    setDeleteConfirmOpen(true);
  }, [canDeleteTrip, isDeletingTrip]);

  const handleDeleteTrip = useCallback(() => {
    void (async () => {
      try {
        setEditError(null);
        await deleteCurrentTrip();
        closeDeleteConfirm();
        setEditOpen(false);
        router.replace("/(tabs)/trips" as Href);
      } catch {
        closeDeleteConfirm();
        setEditError("We couldn't delete the trip. Try again.");
      }
    })();
  }, [closeDeleteConfirm, deleteCurrentTrip, router]);

  useEffect(() => {
    if (!editOpen) {
      setDeleteConfirmOpen(false);
    }
  }, [editOpen]);

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
    }
    tabs.push({ key: "members", label: "Travelers" });
    if (ENABLE_MAP) {
      tabs.push({ key: "map", label: "Map" });
    }
    // Chat tab: only when collaboration active (>1 joined member), mirrors web collaborationGate
    if (collaborationActive) {
      // Chat tab not yet ported (web uses local storage); placeholder for future slice
    }
    return tabs;
  }, [hasSavedItinerary, workspace.tripRaw]);

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
            : "We couldn't load this plan. Try again in a moment."
        }
        onRetry={
          workspace.isNotFound ? undefined : () => void workspace.tripQuery.refetch()
        }
      />
    );
  }

  if (!collaboration || !tripData || !trip) return <ScreenLoading />;

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

      <WorkspaceTabBar
        visibleTabs={visibleTabs}
        activeTab={resolvedTab}
        onTabChange={setActiveTab}
      />

      {(resolvedTab === "overview" || resolvedTab === "itinerary") && (
        <OverviewTab
          trip={trip}
          tripRaw={tripData}
          currentUserEmail={user?.email ?? ""}
          summary={workspace.summary}
          collaboration={collaboration}
          onTripSnapshot={onTripSnapshotQuery.data ?? null}
          canOpenLiveView={canOpenLiveView}
          streamState={streamState}
          onStartStream={handleStartStream}
          onCancelStream={handleCancelStream}
          onOpenTab={setActiveTab}
          onOpenLiveView={() => router.push("/(tabs)/today" as Href)}
          // Park the user on Overview the moment apply succeeds — the saved
          // itinerary is the climax of the create flow, not a side effect.
          onItineraryApplied={() => setActiveTab("overview")}
          showItineraryOnly={resolvedTab === "itinerary"}
          isReadOnly={isReadOnly}
          activityLoadError={
            onTripSnapshotQuery.isError ? "Couldn't load recent activity." : null
          }
        />
      )}
      {resolvedTab === "bookings" && <BookingsTab tripId={tripId} isReadOnly={isReadOnly} />}
      {resolvedTab === "budget" && <BudgetTab tripId={tripId} isReadOnly={isReadOnly} />}
      {resolvedTab === "packing" && <PackingTab tripId={tripId} isReadOnly={isReadOnly} />}
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
        canDeleteTrip={canDeleteTrip}
        onClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        onSubmit={async (value: TripFormValue) => {
          if (isReadOnly) {
            setEditError("Only editors can update this trip.");
            return;
          }
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

      <Modal
        animationType="fade"
        transparent
        visible={deleteConfirmOpen}
        onRequestClose={closeDeleteConfirm}
      >
        <View className="flex-1 justify-end bg-black/35 px-4">
          <Pressable
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Close delete confirmation"
            onPress={closeDeleteConfirm}
          />
          <View
            className="rounded-[28px] border border-border bg-bg-app px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Text className="text-xl text-text" style={fontStyles.headSemibold}>
              {deleteConfirmTitle}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-text-muted" style={fontStyles.uiRegular}>
              {deleteConfirmDescription}
            </Text>
            <View className="mt-5 gap-2">
              <Button
                label={isDeletingTrip ? "Deleting…" : "Delete trip"}
                variant="danger"
                fullWidth
                disabled={isDeletingTrip}
                onPress={handleDeleteTrip}
              />
              <SecondaryButton
                label="Cancel"
                fullWidth
                disabled={isDeletingTrip}
                onPress={closeDeleteConfirm}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { type Trip } from "../../../shared/api/trips";
import { EditTripModal } from "../edit";
import { OverviewTab } from "../workspace/tabs/OverviewTab";
import { MapTab } from "../workspace/tabs/MapTab";
import { BookingsTab } from "../workspace/tabs/BookingsTab";
import { GroupTab } from "../workspace/tabs/GroupTab";
import { BudgetTab } from "../workspace/tabs/BudgetTab";
import { PackingTab } from "../workspace/tabs/PackingTab";
import { ChatTab } from "../workspace/tabs/ChatTab";
import { TripActivityDrawer } from "../logistics/activity";
import { track } from "../../../shared/analytics";
import { WaypointLogo } from "../../../shared/ui";
import { getTripTimelineLabel } from "../workspace/helpers/tripDateUtils";
import { TripListLoadingSkeleton } from "./TripListLoadingSkeleton";
import { PlusIcon } from "./tripListIcons";
import { TripPickerBar } from "./TripPickerBar";
import { TripActionBanner } from "../workspace/TripActionBanner";
import type { TripActionCommand } from "../workspace/models/deriveTripActionItems";
import {
  ITINERARY_DRAFT_PUBLISH_ANCHOR_ID,
  ITINERARY_STREAM_REGION_ID,
} from "../itinerary/itineraryEditorAnchors";
import { TripWorkspaceSection } from "./TripWorkspaceSection";
import { useTripWorkspaceModel } from "./useTripWorkspaceModel";
import { isCollaborationActive } from "../workspace/helpers/collaborationGate";
import { OnTripCompactMode } from "../workspace/OnTripCompactMode";
import { useOnTripMutations } from "../workspace/useOnTripMutations";

interface TripListProps {
  token: string;
  currentUserEmail: string;
  onCreateClick: () => void;
  initialTripId?: number;
  onTripSelect?: (tripId: number | null) => void;
  onTripsChange?: React.Dispatch<React.SetStateAction<Trip[]>>;
}

export const TripList = ({
  token,
  currentUserEmail,
  onCreateClick,
  initialTripId,
  onTripSelect,
  onTripsChange,
}: TripListProps) => {
  const model = useTripWorkspaceModel({
    token,
    currentUserEmail,
    initialTripId,
    onTripSelect,
    onTripsChange,
  });

  // Creation → generation should feel like one fluid arc. When the user just
  // came from `CreateTripForm` (URL carries `?from=create`) and the new trip
  // has no itinerary yet, auto-start the AI stream once so the draft appears
  // without a second "Generate" click.
  //
  // Hooks must be called unconditionally: this effect lives above the early
  // loading/error returns and is guarded internally.
  const [searchParams, setSearchParams] = useSearchParams();
  const autoStartFiredRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (model.status.loading) return;
    if (model.status.error) return;
    if (searchParams.get("from") !== "create") return;

    const selectedTrip = model.selection.selectedTrip;
    if (!selectedTrip) return;

    if (autoStartFiredRef.current.has(selectedTrip.id)) return;

    const savedItinerary = model.draft.selectedSavedItinerary;
    const pendingItinerary = model.draft.selectedPendingItinerary;
    if (savedItinerary || pendingItinerary) return;

    const isStreaming = model.derived.selectedIsStreaming;
    const isAnyGenerating = model.derived.selectedIsAnyGenerating;
    const streamError = model.derived.selectedStreamError;
    if (isStreaming || isAnyGenerating) return;
    if (streamError) return;

    autoStartFiredRef.current.add(selectedTrip.id);
    model.actions.startStream(selectedTrip.id, selectedTrip.notes ?? undefined);

    // Strip the one-shot flag so a reload or back-navigation doesn't retrigger
    // generation against a trip the user may have since edited by hand.
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    setSearchParams(next, { replace: true });
  }, [model, searchParams, setSearchParams]);

  // On-trip mutations hook — called unconditionally so hook order is stable
  // across the early returns below. The hook handles null tripId / snapshot.
  const onTripSnapshotRefresh = useCallback(
    (snap: Parameters<typeof model.actions.updateOnTripSnapshot>[1]) => {
      const selectedTrip = model.selection.selectedTrip;
      if (selectedTrip) model.actions.updateOnTripSnapshot(selectedTrip.id, snap);
    },
    // model reference is stable; model.selection.selectedTrip and
    // model.actions.updateOnTripSnapshot are the only accessed members.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model],
  );
  const onTripMutations = useOnTripMutations({
    token,
    tripId: model.selection.selectedTrip?.id ?? null,
    snapshot: model.derived.selectedOnTripSnapshot ?? null,
    onSnapshotRefresh: onTripSnapshotRefresh,
  });

  if (model.status.loading) return <TripListLoadingSkeleton />;

  if (model.status.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EEE7] p-4">
        <div className="w-full max-w-xl rounded-[24px] border border-[#EAE2D6] bg-[#FEFCF9] p-8 shadow-[0_12px_40px_rgba(28,17,8,0.08)]">
          <WaypointLogo variant="header" />
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
            Trip Workspace
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1C1108]">
            The villa doors are closed for a moment.
          </h2>
          <div
            className="mt-5 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {model.status.error}
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateClick}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C1108] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            <PlusIcon size={15} strokeWidth={2.3} />
            New trip
          </motion.button>
        </div>
      </div>
    );
  }

  if (model.selection.trips.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3EEE7]">
        <header className="border-b border-[#EAE2D6] bg-[#FEFCF9]/96 px-4 py-3 backdrop-blur sm:py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <WaypointLogo variant="header" />
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCreateClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#B86845] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A85B39] sm:gap-2 sm:px-4"
            >
              <PlusIcon size={14} strokeWidth={2.3} />
              New Trip
            </motion.button>
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_18px_50px_rgba(28,17,8,0.08)]">
            <div className="relative h-[220px] bg-[linear-gradient(120deg,#1C1108_0%,#6B5E52_45%,#B86845_100%)] sm:h-[280px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.14),transparent_40%)]" />
              <div className="absolute left-5 top-5 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/90 backdrop-blur sm:left-7 sm:top-7">
                Trip workspace
              </div>
              <div className="absolute bottom-5 left-5 right-5 grid gap-2 text-white/90 sm:bottom-7 sm:left-7 sm:right-7 sm:grid-cols-3">
                <div className="rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-[11px] font-medium">
                  Shared itinerary
                </div>
                <div className="rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-[11px] font-medium">
                  Team coordination
                </div>
                <div className="rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-[11px] font-medium">
                  Ready-to-travel checks
                </div>
              </div>
            </div>
            <div className="px-5 py-7 text-center sm:px-8 sm:py-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
                First trip
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#1C1108] sm:text-3xl">
                Open your first shared trip workspace.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[13.5px] leading-relaxed text-[#6B5E52]">
                Start with destination and dates. Then shape the plan with
                manual edits first, optional AI assist, and one place your group
                can actually use together.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onCreateClick}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B86845] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A85B39]"
                >
                  <PlusIcon size={15} strokeWidth={2.3} />
                  Create your first trip
                </motion.button>
                <p className="text-[11px] text-[#8A7E74]">
                  You can invite people and collaborate after setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    trips,
    selectedTripId,
    selectedTrip,
    activeTab,
    selectTrip,
    openWorkspaceTab,
  } = model.selection;

  const {
    selectedTripStatus,
    selectedPackingSummary,
    selectedBudgetSummary,
    selectedReservationSummary,
    selectedSummariesLoaded,
    selectedReadiness,
    showWorkspace,
    selectedDurationDays,
    selectedActivities,
    selectedActivityStripItems,
    selectedActivityHasUnseenChanges,
    selectedUnreadCount,
    selectedReadIds,
    selectedTripIsMuted,
    selectedTripIsOwner,
    selectedMemberDraft,
    selectedMemberError,
    selectedMemberFeedback,
    selectedIsAddingMember,
    selectedIsStreaming,
    selectedHasStreamContent,
    selectedStreamError,
    selectedIsRegenerating,
    selectedIsApplying,
    selectedDraftMutationState,
    selectedIsAnyGenerating,
    selectedOnTripSnapshot,
    selectedIsOnTripCompactMode,
    selectedOnTripCompactDismissed,
    selectedIsOnTripPending,
  } = model.derived;

  const {
    selectedSavedItinerary,
    selectedPendingItinerary,
    selectedDraftPlanMeta,
    selectedControls,
    lockedItemIds,
    favoriteItemIds,
  } = model.draft;

  const {
    isActivityDrawerOpen,
    activityFilter,
    showActivityPreferences,
    mutedTripIds,
    setActivityFilter,
    setShowActivityPreferences,
    setIsActivityDrawerOpen,
    openActivityDrawer,
    toggleTripMute,
    markActivityAsRead,
    markAllActivitiesAsRead,
  } = model.activity;

  const {
    setTrips,
    setEditingTrip,
    setConfirmDelete,
    handleDeleteTrip,
    handleApply,
    handleRegenerateDraft,
    handleRunAiAssist,
    handleMoveDraftItem,
    handleAddDraftDay,
    handleStartManualDraft,
    handleUpdateDraftDay,
    handleAddDraftStop,
    handleAddDraftStopWithInitial,
    handleUpdateDraftStop,
    handleDeleteDraftStop,
    handleDuplicateDraftStop,
    handleReorderDraftStopWithinDay,
    handleDuplicateDraftDay,
    handleClearDraftDay,
    toggleDraftSelection,
    setRegenerationControls,
    setBudgetSummaries,
    setPackingSummaries,
    setReservationSummaries,
    setMemberDrafts,
    setLockedItemIds,
    setFavoriteItemIds,
    handleAddMember,
    startStream,
    resetStream,
    handleEditSavedAsDraft,
    handleShareTrip,
    dismissOnTripCompactMode,
    restoreOnTripCompactMode,
    updateOnTripSnapshot,
  } = model.actions;

  const { isMobileLayout, confirmDelete, editingTrip } = model.ui;
  const { tripActionError, draftActionError } = model.status;
  const actionability = model.derived.actionability;

  const focusItineraryAnchor = (elementId: string) => {
    openWorkspaceTab("overview");
    requestAnimationFrame(() => {
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleActionCommand = (command: TripActionCommand) => {
    if (command.kind === "open_tab" && command.tab) {
      openWorkspaceTab(command.tab);
      return;
    }
    if (command.kind === "open_activity_drawer") {
      openActivityDrawer();
      return;
    }
    if (command.kind === "focus_draft_publish") {
      focusItineraryAnchor(ITINERARY_DRAFT_PUBLISH_ANCHOR_ID);
      return;
    }
    if (command.kind === "focus_itinerary_stream") {
      focusItineraryAnchor(ITINERARY_STREAM_REGION_ID);
    }
  };

  const showReturnToOnTripChip =
    Boolean(selectedTrip) &&
    selectedOnTripSnapshot?.mode === "active" &&
    selectedOnTripCompactDismissed &&
    !selectedIsOnTripCompactMode;

  const returnToOnTripChip = showReturnToOnTripChip ? (
    <button
      type="button"
      onClick={() => selectedTrip && restoreOnTripCompactMode(selectedTrip.id)}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#1C1108] bg-[#1C1108] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#2B1B0F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
      aria-label="Return to On-Trip mode"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#F5C14D]" />
      On-Trip
    </button>
  ) : null;

  return (
    <div>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
        {!selectedIsOnTripCompactMode ? (
          <TripPickerBar
            trips={trips}
            selectedTripId={selectedTripId}
            onTripChange={selectTrip}
            onCreateClick={onCreateClick}
            leadingAction={returnToOnTripChip}
          />
        ) : null}

        {showWorkspace && selectedTrip && selectedTripStatus ? (
          selectedIsOnTripPending ? (
            <section
              aria-busy="true"
              aria-label="Loading trip view"
              className="overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_18px_55px_rgba(28,17,8,0.08)]"
            >
              <div className="border-b border-[#EDE7DD] bg-[#FAF8F5]/80 px-5 py-4 sm:px-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
                      Trip workspace
                    </p>
                    <h2 className="mt-1 truncate text-xl font-semibold text-[#1C1108]">
                      {selectedTrip.title}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="space-y-3 px-5 py-4 sm:px-7">
                <div className="h-20 animate-pulse rounded-2xl bg-[#EDE7DD]/60" />
                <div className="h-14 animate-pulse rounded-2xl bg-[#EDE7DD]/60" />
                <div className="h-14 animate-pulse rounded-2xl bg-[#EDE7DD]/60" />
              </div>
            </section>
          ) : selectedIsOnTripCompactMode && selectedOnTripSnapshot ? (
            <OnTripCompactMode
              trip={selectedTrip}
              viewSnapshot={onTripMutations.viewSnapshot ?? selectedOnTripSnapshot}
              setStopStatus={onTripMutations.setStopStatus}
              isUpdatingStop={onTripMutations.isUpdatingStop}
              feedback={onTripMutations.feedback}
              dismissFeedback={onTripMutations.dismissFeedback}
              logUnplannedStop={onTripMutations.logUnplannedStop}
              removeUnplannedStop={onTripMutations.removeUnplannedStop}
              isLoggingUnplanned={onTripMutations.isLoggingUnplanned}
              unplannedPendingIds={onTripMutations.unplannedPendingIds}
              onOpenFullWorkspace={() => {
                dismissOnTripCompactMode(selectedTrip.id);
                openWorkspaceTab("overview");
              }}
              activityUnreadCount={selectedUnreadCount}
              onOpenActivityDrawer={openActivityDrawer}
            />
          ) : (
          <TripWorkspaceSection
            trip={selectedTrip}
            packingSummary={selectedPackingSummary}
            budgetSummary={selectedBudgetSummary}
            reservationSummary={selectedReservationSummary}
            durationDays={selectedDurationDays}
            timelineLabel={getTripTimelineLabel(
              selectedTrip.start_date,
              selectedTrip.end_date,
            )}
            readiness={selectedReadiness}
            summariesLoaded={selectedSummariesLoaded}
            activeTab={activeTab}
            onTabChange={openWorkspaceTab}
            bookingsBadge={selectedReservationSummary?.upcoming ?? 0}
            groupBadge={selectedTrip.member_count}
            hasItinerary={selectedSavedItinerary !== null}
            showChat={isCollaborationActive(selectedTrip)}
            activityUnreadCount={selectedUnreadCount}
            isActivityMuted={selectedTripIsMuted}
            onManageGroup={() => openWorkspaceTab("members")}
            onOpenActivityDrawer={openActivityDrawer}
            activityStripItems={selectedActivityStripItems}
            activityHasUnseenChanges={selectedActivityHasUnseenChanges}
            onShareTrip={handleShareTrip}
          >
                <TripActionBanner
                  model={actionability}
                  onCommand={handleActionCommand}
                />

                <AnimatePresence>
                  {tripActionError ? (
                    <motion.div
                      key="trip-action-err"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-4 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                      role="alert"
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-danger/90">
                        Trip action
                      </span>
                      {tripActionError}
                    </motion.div>
                  ) : null}
                  {draftActionError ? (
                    <motion.div
                      key="draft-action-err"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-4 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                      role="alert"
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-danger/90">
                        Itinerary edits
                      </span>
                      {draftActionError}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {confirmDelete && selectedTripIsOwner ? (
                  <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4">
                    <p className="text-sm font-semibold text-danger">
                      Delete this trip workspace?
                    </p>
                    <p className="mt-1 text-sm text-danger/90">
                      This removes the shared trip and every member&apos;s
                      personal trip tracking for it.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void handleDeleteTrip(selectedTrip)}
                        className="rounded-full border border-danger/25 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger cursor-pointer"
                      >
                        Delete trip
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-full bg-[#F0EBE4] px-4 py-2 text-sm font-semibold text-[#1C1108] cursor-pointer"
                      >
                        Keep trip
                      </motion.button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "overview" && (
                  <OverviewTab
                    trip={selectedTrip}
                    packingSummary={selectedPackingSummary}
                    budgetSummary={selectedBudgetSummary}
                    reservationSummary={selectedReservationSummary}
                    actionability={actionability}
                    activities={selectedActivities}
                    isStreaming={selectedIsStreaming}
                    hasStreamContent={selectedHasStreamContent}
                    streamError={selectedStreamError}
                    isAnyGenerating={selectedIsAnyGenerating}
                    isRegenerating={selectedIsRegenerating}
                    isApplying={selectedIsApplying}
                    draftMutationState={selectedDraftMutationState}
                    draftPublishError={draftActionError}
                    savedItinerary={selectedSavedItinerary}
                    pendingItinerary={selectedPendingItinerary}
                    draftPlanMeta={selectedDraftPlanMeta}
                    controls={selectedControls}
                    lockedItemIds={lockedItemIds[selectedTrip.id] ?? []}
                    favoriteItemIds={favoriteItemIds[selectedTrip.id] ?? []}
                    onStartStream={() =>
                      startStream(
                        selectedTrip.id,
                        selectedTrip.notes ?? undefined,
                      )
                    }
                    onCancelStream={() => resetStream(selectedTrip.id)}
                    onEditSavedAsDraft={handleEditSavedAsDraft}
                    onStartManualDraft={() =>
                      handleStartManualDraft(selectedTrip.id)
                    }
                    onApply={() => void handleApply(selectedTrip.id)}
                    onMoveItem={(intent) =>
                      handleMoveDraftItem(selectedTrip.id, intent)
                    }
                    onUpdateDay={(dayNumber, patch) =>
                      handleUpdateDraftDay(selectedTrip.id, dayNumber, patch)
                    }
                    onAddStop={(dayNumber, insertAfterIndex) =>
                      handleAddDraftStop(
                        selectedTrip.id,
                        dayNumber,
                        insertAfterIndex,
                      )
                    }
                    onUpdateStop={(dayNumber, stopId, patch) =>
                      handleUpdateDraftStop(
                        selectedTrip.id,
                        dayNumber,
                        stopId,
                        patch,
                      )
                    }
                    onDeleteStop={(dayNumber, stopId) =>
                      handleDeleteDraftStop(selectedTrip.id, dayNumber, stopId)
                    }
                    onDuplicateStop={(dayNumber, stopId) =>
                      handleDuplicateDraftStop(
                        selectedTrip.id,
                        dayNumber,
                        stopId,
                      )
                    }
                    onReorderStopWithinDay={(
                      dayNumber,
                      sourceIndex,
                      targetIndex,
                    ) =>
                      handleReorderDraftStopWithinDay(
                        selectedTrip.id,
                        dayNumber,
                        sourceIndex,
                        targetIndex,
                      )
                    }
                    onDuplicateDay={(dayNumber) =>
                      handleDuplicateDraftDay(selectedTrip.id, dayNumber)
                    }
                    onClearDay={(dayNumber) =>
                      handleClearDraftDay(selectedTrip.id, dayNumber)
                    }
                    onToggleLock={(itemId) =>
                      toggleDraftSelection(
                        selectedTrip.id,
                        itemId,
                        setLockedItemIds,
                      )
                    }
                    onToggleFavorite={(itemId) =>
                      toggleDraftSelection(
                        selectedTrip.id,
                        itemId,
                        setFavoriteItemIds,
                      )
                    }
                    onRegenerateDayChange={(dayNumber) =>
                      setRegenerationControls((prev) => ({
                        ...prev,
                        [selectedTrip.id]: {
                          ...(prev[selectedTrip.id] ?? selectedControls!),
                          dayNumber,
                        },
                      }))
                    }
                    onRegenerateTimeBlockChange={(timeBlock) =>
                      setRegenerationControls((prev) => ({
                        ...prev,
                        [selectedTrip.id]: {
                          ...(prev[selectedTrip.id] ?? selectedControls!),
                          timeBlock,
                        },
                      }))
                    }
                    onRegenerateVariantChange={(variant) =>
                      setRegenerationControls((prev) => ({
                        ...prev,
                        [selectedTrip.id]: {
                          ...(prev[selectedTrip.id] ?? selectedControls!),
                          variant,
                        },
                      }))
                    }
                    onRegenerate={() =>
                      void handleRegenerateDraft(selectedTrip.id)
                    }
                    onRunAiAssist={(request) =>
                      void handleRunAiAssist(selectedTrip.id, request)
                    }
                    onAddDay={() => handleAddDraftDay(selectedTrip.id)}
                    onOpenTab={(tab) => openWorkspaceTab(tab)}
                    onOpenActivityDrawer={openActivityDrawer}
                    onActionCommand={handleActionCommand}
                    onItineraryDayToggle={(dayNumber, isOpen) => {
                      track({
                        name: "overview_day_toggled",
                        props: {
                          trip_id: selectedTrip.id,
                          day_number: dayNumber,
                          is_open: isOpen,
                        },
                      });
                    }}
                  />
                )}

                {activeTab === "map" && (
                  <MapTab
                    tripId={selectedTrip.id}
                    itinerary={selectedSavedItinerary}
                  />
                )}

                {activeTab === "bookings" && (
                  <BookingsTab
                    token={token}
                    tripId={selectedTrip.id}
                    pendingItinerary={selectedPendingItinerary}
                    onAddStopFromBooking={(dayNumber, initial) =>
                      handleAddDraftStopWithInitial(
                        selectedTrip.id,
                        dayNumber,
                        initial,
                      )
                    }
                    onSummaryChange={(summary) =>
                      setReservationSummaries((prev) => ({
                        ...prev,
                        [selectedTrip.id]: summary,
                      }))
                    }
                  />
                )}

                {activeTab === "chat" && (
                  <ChatTab
                    token={token}
                    tripId={selectedTrip.id}
                    tripTitle={selectedTrip.title}
                    members={selectedTrip.members}
                    currentUserEmail={currentUserEmail}
                    itineraryDays={
                      (selectedPendingItinerary ?? selectedSavedItinerary)
                        ?.days ?? null
                    }
                    onOpenContextTab={(tab) => openWorkspaceTab(tab)}
                  />
                )}

                {activeTab === "members" && (
                  <GroupTab
                    trip={selectedTrip}
                    isOwner={selectedTripIsOwner}
                    memberDraft={selectedMemberDraft}
                    memberError={selectedMemberError}
                    memberFeedback={selectedMemberFeedback}
                    isAddingMember={selectedIsAddingMember}
                    onDraftChange={(value) =>
                      setMemberDrafts((prev) => ({
                        ...prev,
                        [selectedTrip.id]: value,
                      }))
                    }
                    onAddMember={() => void handleAddMember(selectedTrip.id)}
                  />
                )}

                {activeTab === "budget" && (
                  <BudgetTab
                    token={token}
                    tripId={selectedTrip.id}
                    onSummaryChange={(summary) =>
                      setBudgetSummaries((prev) => ({
                        ...prev,
                        [selectedTrip.id]: summary,
                      }))
                    }
                  />
                )}

                {activeTab === "packing" && (
                  <PackingTab
                    token={token}
                    tripId={selectedTrip.id}
                    onPackingSummaryChange={(summary) =>
                      setPackingSummaries((prev) => ({
                        ...prev,
                        [selectedTrip.id]: summary,
                      }))
                    }
                  />
                )}
          </TripWorkspaceSection>
          )
        ) : null}
      </main>

      <TripActivityDrawer
        isOpen={isActivityDrawerOpen}
        isMobile={isMobileLayout}
        trip={selectedTrip}
        activities={selectedTripIsMuted ? [] : selectedActivities}
        unreadIds={selectedReadIds}
        activeFilter={activityFilter}
        mutedTripIds={mutedTripIds}
        allTrips={trips}
        onClose={() => {
          setIsActivityDrawerOpen(false);
          setShowActivityPreferences(false);
        }}
        onFilterChange={(next) => {
          setActivityFilter(next);
          if (selectedTrip) {
            track({
              name: "trip_activity_filter_changed",
              props: {
                trip_id: selectedTrip.id,
                filter: next,
              },
            });
          }
        }}
        onMarkAllRead={markAllActivitiesAsRead}
        onMarkRead={markActivityAsRead}
        onOpenPreferences={() => setShowActivityPreferences((prev) => !prev)}
        showPreferences={showActivityPreferences}
        onToggleCurrentTripMute={() => {
          if (!selectedTrip) return;
          toggleTripMute(selectedTrip.id, "activity_preferences");
        }}
        onUnmuteTrip={(tripId) => {
          if (!mutedTripIds.includes(tripId)) return;
          toggleTripMute(tripId, "activity_preferences");
        }}
      />

      <AnimatePresence>
        {editingTrip && (
          <EditTripModal
            key={editingTrip.id}
            token={token}
            trip={editingTrip}
            onSuccess={(updatedTrip) => {
              setTrips((prev) =>
                prev.map((trip) =>
                  trip.id === updatedTrip.id ? updatedTrip : trip,
                ),
              );
              setEditingTrip(null);
            }}
            onClose={() => setEditingTrip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

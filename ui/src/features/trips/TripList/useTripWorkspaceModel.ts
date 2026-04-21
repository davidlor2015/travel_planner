import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createTripInvite,
  deleteTrip,
  getTrips,
  getTripSummaries,
  updateWorkspaceLastSeen,
  type Trip,
  type TripSummary,
} from "../../../shared/api/trips";
import {
  applyItinerary,
  getSavedItinerary,
  refineItinerary,
  type Itinerary,
} from "../../../shared/api/ai";
import {
  type DraftAiAssistRequest,
  appendEditableItineraryDay,
  buildItemReferences,
  preserveSelectionIds,
  toApiItinerary,
  toEditableItinerary,
  type EditableItinerary,
  type MoveEditableItineraryItemIntent,
  type EditableStopPatch,
} from "../itineraryDraft";
import {
  loadMutedTripIds,
  saveMutedTripIds,
} from "../TripActivity";
import { track } from "../../../shared/analytics";
import { useStreamingItinerary } from "../../../shared/hooks/useStreamingItinerary";
import { type WorkspaceTab } from "../workspace/WorkspaceTabBar";
import { parseTripItineraryPayload } from "../workspace/normalizeTripWorkspace";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../workspace/types";
import {
  formatTripDateRange,
  getTripDurationDays,
  getTripStatus,
} from "../workspace/tripDateUtils";
import {
  buildManualItineraryDraft,
  getAiAssistPayload,
  getDefaultRegenerationControls,
  type RegenerationControlState,
} from "../workspace/tripItineraryDraftWorkspace";
import { buildTripReadinessSnapshot } from "../workspace/tripOverviewViewModel";
import {
  createInitialBudgetSummary,
  createInitialPackingSummary,
  createInitialReservationSummary,
} from "../workspace/workspaceFallbacks";
import { WORKSPACE_STORAGE_KEY } from "../workspace/workspacePersistence";
import {
  buildTripActionabilityModel,
  deriveTripActionItems,
  type TripActionDerivationInput,
} from "../workspace/deriveTripActionItems";
import {
  buildWorkspaceActivityModel,
  coerceWorkspaceActivitySnapshot,
} from "../workspace/workspaceActivityModel";
import { createItineraryDraftMutations } from "./itineraryDraftMutations";
import { deriveDraftMutationState } from "./draftPublishStateMachine";

interface DraftPlanMeta {
  source: string;
  sourceLabel: string;
  fallbackUsed: boolean;
}

export interface UseTripWorkspaceModelArgs {
  token: string;
  currentUserEmail: string;
  initialTripId?: number;
  onTripSelect?: (tripId: number | null) => void;
  onTripsChange?: React.Dispatch<React.SetStateAction<Trip[]>>;
}

export function useTripWorkspaceModel({
  token,
  currentUserEmail,
  initialTripId,
  onTripSelect,
  onTripsChange,
}: UseTripWorkspaceModelArgs) {
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripActionError, setTripActionError] = useState<string | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [pendingItineraries, setPendingItineraries] = useState<
    Record<number, EditableItinerary>
  >({});
  const [savedItineraries, setSavedItineraries] = useState<
    Record<number, Itinerary | null>
  >({});
  const [draftPlanMeta, setDraftPlanMeta] = useState<
    Record<number, DraftPlanMeta>
  >({});
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(
    new Set(),
  );
  const [applyingIds, setApplyingIds] = useState<Set<number>>(new Set());
  const [appliedSuccessIds, setAppliedSuccessIds] = useState<Set<number>>(
    new Set(),
  );

  const [packingSummaries, setPackingSummaries] = useState<
    Record<number, PackingSummary>
  >({});
  const [budgetSummaries, setBudgetSummaries] = useState<
    Record<number, BudgetSummary>
  >({});
  const [reservationSummaries, setReservationSummaries] = useState<
    Record<number, ReservationSummary>
  >({});

  const [lockedItemIds, setLockedItemIds] = useState<Record<number, string[]>>(
    {},
  );
  const [favoriteItemIds, setFavoriteItemIds] = useState<
    Record<number, string[]>
  >({});
  const [regenerationControls, setRegenerationControls] = useState<
    Record<number, RegenerationControlState>
  >({});
  const [memberDrafts, setMemberDrafts] = useState<Record<number, string>>({});
  const [memberErrors, setMemberErrors] = useState<
    Record<number, string | null>
  >({});
  const [memberFeedback, setMemberFeedback] = useState<
    Record<number, string | null>
  >({});
  const [addingMemberIds, setAddingMemberIds] = useState<Set<number>>(
    new Set(),
  );

  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "unread">("all");
  const [showActivityPreferences, setShowActivityPreferences] = useState(false);
  const [mutedTripIds, setMutedTripIds] = useState<number[]>(() =>
    loadMutedTripIds(),
  );

  const {
    streams,
    start: startStream,
    reset: resetStreamBase,
  } = useStreamingItinerary(token);
  const trackedStreamCompletions = useRef<Set<number>>(new Set());
  const viewedSavedItineraryIds = useRef<Set<number>>(new Set());

  const resetStream = useCallback(
    (tripId: number) => {
      trackedStreamCompletions.current.delete(tripId);
      resetStreamBase(tripId);
    },
    [resetStreamBase],
  );
  const draftMutations = useMemo(
    () => createItineraryDraftMutations(setPendingItineraries),
    [],
  );

  const clearAppliedSuccess = useCallback((tripId: number) => {
    setAppliedSuccessIds((prev) => {
      if (!prev.has(tripId)) return prev;
      const next = new Set(prev);
      next.delete(tripId);
      return next;
    });
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobileLayout(window.innerWidth < 640);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    onTripsChange?.(trips);
  }, [onTripsChange, trips]);

  useEffect(() => {
    saveMutedTripIds(mutedTripIds);
  }, [mutedTripIds]);

  useEffect(() => {
    let cancelled = false;

    const loadTripWorkspaceMeta = async () => {
      setLoading(true);
      setError(null);
      setPackingSummaries({});
      setBudgetSummaries({});
      setReservationSummaries({});

      try {
        const tripRows = await getTrips(token);
        if (cancelled) return;
        setTrips(tripRows);
        setLoading(false);

        try {
          const summaryRows = await getTripSummaries(token);
          if (cancelled) return;

          setPackingSummaries(
            Object.fromEntries(
              summaryRows.map((summary: TripSummary) => [
                summary.trip_id,
                {
                  total: summary.packing_total,
                  checked: summary.packing_checked,
                  progressPct: summary.packing_progress_pct,
                  loading: false,
                },
              ]),
            ),
          );
          setBudgetSummaries(
            Object.fromEntries(
              summaryRows.map((summary: TripSummary) => [
                summary.trip_id,
                {
                  limit: summary.budget_limit,
                  totalSpent: summary.budget_total_spent,
                  remaining: summary.budget_remaining,
                  isOverBudget: summary.budget_is_over,
                  expenseCount: summary.budget_expense_count,
                  loading: false,
                },
              ]),
            ),
          );
          setReservationSummaries(
            Object.fromEntries(
              summaryRows.map((summary: TripSummary) => [
                summary.trip_id,
                {
                  total: summary.reservation_count,
                  upcoming: summary.reservation_upcoming_count,
                  loading: false,
                },
              ]),
            ),
          );
        } catch {
          // Summaries are best-effort and should not block rendering.
        }
        return;
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTripWorkspaceMeta();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (trips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    const storedTripId = (() => {
      try {
        const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { selectedTripId?: number | null };
        return typeof parsed.selectedTripId === "number"
          ? parsed.selectedTripId
          : null;
      } catch {
        return null;
      }
    })();

    if (initialTripId && trips.some((trip) => trip.id === initialTripId)) {
      setSelectedTripId(initialTripId);
      return;
    }

    if (storedTripId && trips.some((trip) => trip.id === storedTripId)) {
      setSelectedTripId(storedTripId);
      return;
    }

    if (selectedTripId && trips.some((trip) => trip.id === selectedTripId)) {
      return;
    }

    setSelectedTripId(trips[0].id);
  }, [initialTripId, isMobileLayout, selectedTripId, trips]);

  useEffect(() => {
    try {
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({ selectedTripId }),
      );
    } catch {
      // ignore storage failures
    }
  }, [selectedTripId]);

  useEffect(() => {
    for (const [tripIdKey, streamState] of Object.entries(streams)) {
      const tripId = Number(tripIdKey);
      const completedItinerary = streamState?.itinerary;
      if (!completedItinerary) continue;

      if (!trackedStreamCompletions.current.has(tripId)) {
        trackedStreamCompletions.current.add(tripId);
        track({
          name: "itinerary_generated",
          props: {
            trip_id: tripId,
            source: completedItinerary.source,
            source_label: completedItinerary.source_label,
            fallback_used: completedItinerary.fallback_used,
            day_count: completedItinerary.days.length,
          },
        });
      }

      setPendingItineraries((prev) => {
        if (prev[tripId]) return prev;
        const editable = toEditableItinerary(completedItinerary);
        setDraftPlanMeta((prevMeta) => ({
          ...prevMeta,
          [tripId]: {
            source: completedItinerary.source,
            sourceLabel: completedItinerary.source_label,
            fallbackUsed: completedItinerary.fallback_used,
          },
        }));
        setRegenerationControls((controls) => ({
          ...controls,
          [tripId]:
            controls[tripId] ?? getDefaultRegenerationControls(editable),
        }));
        return { ...prev, [tripId]: editable };
      });
    }
  }, [streams]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  );

  const selectedTripStatus = selectedTrip
    ? getTripStatus(selectedTrip.start_date, selectedTrip.end_date)
    : null;

  useEffect(() => {
    if (!selectedTrip) return;
    if (savedItineraries[selectedTrip.id] !== undefined) return;

    let cancelled = false;
    void (async () => {
      try {
        const saved = await getSavedItinerary(token, selectedTrip.id);
        if (cancelled) return;
        setSavedItineraries((prev) => ({
          ...prev,
          [selectedTrip.id]: saved,
        }));
      } catch {
        if (cancelled) return;
        setSavedItineraries((prev) => ({
          ...prev,
          [selectedTrip.id]: null,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [savedItineraries, selectedTrip, token]);

  const selectedPackingSummary = useMemo(
    () =>
      selectedTrip
        ? (packingSummaries[selectedTrip.id] ?? createInitialPackingSummary())
        : createInitialPackingSummary(),
    [packingSummaries, selectedTrip],
  );
  const selectedBudgetSummary = useMemo(
    () =>
      selectedTrip
        ? (budgetSummaries[selectedTrip.id] ?? createInitialBudgetSummary())
        : createInitialBudgetSummary(),
    [budgetSummaries, selectedTrip],
  );
  const selectedReservationSummary = useMemo(
    () =>
      selectedTrip
        ? (reservationSummaries[selectedTrip.id] ??
            createInitialReservationSummary())
        : createInitialReservationSummary(),
    [reservationSummaries, selectedTrip],
  );
  const selectedSavedItinerary = selectedTrip?.description
    ? (savedItineraries[selectedTrip.id] ??
      parseTripItineraryPayload(selectedTrip.description))
    : null;
  const selectedHasSavedItinerary = selectedSavedItinerary !== null;
  const selectedPendingItinerary = selectedTrip
    ? (pendingItineraries[selectedTrip.id] ?? null)
    : null;
  const selectedCurrentItinerary =
    selectedPendingItinerary ?? selectedSavedItinerary;
  const selectedDraftPlanMeta = selectedTrip
    ? (draftPlanMeta[selectedTrip.id] ?? null)
    : null;
  const selectedControls = selectedTrip
    ? (regenerationControls[selectedTrip.id] ??
      (selectedPendingItinerary
        ? getDefaultRegenerationControls(selectedPendingItinerary)
        : null))
    : null;
  const selectedStreamError = selectedTrip
    ? (streams[selectedTrip.id]?.error ?? null)
    : null;
  const selectedMember = selectedTrip
    ? selectedTrip.members.find(
        (member) => member.email.toLowerCase() === currentUserEmail.toLowerCase(),
      ) ?? null
    : null;
  const selectedLastSeenSignature = selectedMember?.workspace_last_seen_signature ?? null;
  const selectedLastSeenSnapshot = coerceWorkspaceActivitySnapshot(
    (selectedMember?.workspace_last_seen_snapshot as Record<string, unknown> | null | undefined) ??
      null,
  );
  const selectedActivityModel = useMemo(
    () =>
      selectedTrip
        ? buildWorkspaceActivityModel({
            input: {
              trip: selectedTrip,
              itinerary: selectedCurrentItinerary,
              packingSummary: selectedPackingSummary,
              budgetSummary: selectedBudgetSummary,
              reservationSummary: selectedReservationSummary,
              workspace: {
                hasPendingDraft: selectedPendingItinerary !== null,
                tripActionError,
                draftActionError,
                streamError: selectedStreamError,
              },
            },
            lastSeenSignature: selectedLastSeenSignature,
            lastSeenSnapshot: selectedLastSeenSnapshot,
          })
        : null,
    [
      selectedTrip,
      selectedCurrentItinerary,
      selectedPackingSummary,
      selectedBudgetSummary,
      selectedReservationSummary,
      selectedPendingItinerary,
      tripActionError,
      draftActionError,
      selectedStreamError,
      selectedLastSeenSignature,
      selectedLastSeenSnapshot,
    ],
  );
  const selectedActivities = selectedActivityModel?.drawerItems ?? [];
  const selectedTripIsMuted = selectedTrip
    ? mutedTripIds.includes(selectedTrip.id)
    : false;
  const selectedReadIds = selectedActivityModel?.hasUnseenChanges
    ? new Set<string>()
    : new Set(selectedActivities.map((activity) => activity.id));
  const selectedUnreadCount = selectedTripIsMuted
    ? 0
    : selectedActivityModel?.hasUnseenChanges
      ? selectedActivities.length
      : 0;

  useEffect(() => {
    if (!selectedTrip) {
      setIsActivityDrawerOpen(false);
      setShowActivityPreferences(false);
      return;
    }
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip || activeTab !== "overview" || !selectedHasSavedItinerary)
      return;
    if (viewedSavedItineraryIds.current.has(selectedTrip.id)) return;
    viewedSavedItineraryIds.current.add(selectedTrip.id);
    track({
      name: "itinerary_viewed",
      props: { trip_id: selectedTrip.id, source: "overview" },
    });
  }, [activeTab, selectedHasSavedItinerary, selectedTrip]);

  const toggleTripMute = (
    tripId: number,
    source: "quick_menu" | "activity_preferences",
  ) => {
    setMutedTripIds((prev) => {
      const currentlyMuted = prev.includes(tripId);
      const next = currentlyMuted
        ? prev.filter((id) => id !== tripId)
        : [...prev, tripId];

      track({
        name: "trip_activity_mute_toggled",
        props: {
          trip_id: tripId,
          muted: !currentlyMuted,
          source,
        },
      });

      return next;
    });
  };

  const selectTrip = (tripId: number) => {
    const nextTrip = trips.find((trip) => trip.id === tripId);
    setSelectedTripId(tripId);
    setActiveTab("overview");
    onTripSelect?.(tripId);
    setConfirmDelete(false);
    track({
      name: "trip_workspace_opened",
      props: {
        trip_id: tripId,
        destination: nextTrip?.destination,
        source: "trip_switcher",
      },
    });
  };

  const openWorkspaceTab = (tab: WorkspaceTab) => {
    if (selectedTrip && activeTab !== tab) {
      track({
        name: "trip_workspace_tab_opened",
        props: {
          trip_id: selectedTrip.id,
          tab,
        },
      });
    }
    setActiveTab(tab);
  };

  const openActivityDrawer = () => {
    if (!selectedTrip) return;
    setIsActivityDrawerOpen(true);
    setShowActivityPreferences(false);
    setActivityFilter("all");
    track({
      name: "trip_activity_drawer_opened",
      props: {
        trip_id: selectedTrip.id,
        unread_count: selectedUnreadCount,
      },
    });
  };

  const applyWorkspaceLastSeenLocal = (
    tripId: number,
    payload: {
      signature: string;
      snapshot: Record<string, unknown>;
      seenAt: string;
    },
  ) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          members: trip.members.map((member) => {
            if (member.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
              return member;
            }
            return {
              ...member,
              workspace_last_seen_signature: payload.signature,
              workspace_last_seen_snapshot: payload.snapshot,
              workspace_last_seen_at: payload.seenAt,
            };
          }),
        };
      }),
    );
  };

  const markAllActivitiesAsRead = async () => {
    if (!selectedTrip || !selectedActivityModel) return;
    try {
      const response = await updateWorkspaceLastSeen(token, selectedTrip.id, {
        signature: selectedActivityModel.signature,
        snapshot: selectedActivityModel.snapshot as unknown as Record<string, unknown>,
      });
      applyWorkspaceLastSeenLocal(selectedTrip.id, {
        signature: response.workspace_last_seen_signature ?? selectedActivityModel.signature,
        snapshot:
          response.workspace_last_seen_snapshot ??
          (selectedActivityModel.snapshot as unknown as Record<string, unknown>),
        seenAt: response.workspace_last_seen_at ?? new Date().toISOString(),
      });
      track({
        name: "trip_activity_mark_all_read",
        props: {
          trip_id: selectedTrip.id,
          count: selectedActivities.length,
        },
      });
    } catch {
      // Keep change-awareness optimistic and non-blocking.
    }
  };

  const markActivityAsRead = (activityId: string) => {
    void activityId;
    void markAllActivitiesAsRead();
  };

  const upsertDraftItinerary = (
    tripId: number,
    itinerary: Itinerary,
    previous?: EditableItinerary,
  ) => {
    const editable = toEditableItinerary(itinerary, previous);
    setPendingItineraries((prev) => ({ ...prev, [tripId]: editable }));
    setDraftPlanMeta((prev) => ({
      ...prev,
      [tripId]: {
        source: itinerary.source,
        sourceLabel: itinerary.source_label,
        fallbackUsed: itinerary.fallback_used,
      },
    }));
    setRegenerationControls((prev) => ({
      ...prev,
      [tripId]: prev[tripId] ?? getDefaultRegenerationControls(editable),
    }));

    if (previous) {
      setLockedItemIds((prev) => ({
        ...prev,
        [tripId]: preserveSelectionIds(previous, editable, prev[tripId] ?? []),
      }));
      setFavoriteItemIds((prev) => ({
        ...prev,
        [tripId]: preserveSelectionIds(previous, editable, prev[tripId] ?? []),
      }));
    } else {
      setLockedItemIds((prev) => ({ ...prev, [tripId]: prev[tripId] ?? [] }));
      setFavoriteItemIds((prev) => ({ ...prev, [tripId]: prev[tripId] ?? [] }));
    }
  };

  const toggleDraftSelection = (
    tripId: number,
    itemId: string,
    setter: (
      updater: (prev: Record<number, string[]>) => Record<number, string[]>,
    ) => void,
  ) => {
    setter((prev) => {
      const current = new Set(prev[tripId] ?? []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      return { ...prev, [tripId]: Array.from(current) };
    });
  };

  const handleAddMember = async (tripId: number) => {
    const email = (memberDrafts[tripId] ?? "").trim();
    if (!email) return;

    setMemberErrors((prev) => ({ ...prev, [tripId]: null }));
    setMemberFeedback((prev) => ({ ...prev, [tripId]: null }));
    setAddingMemberIds((prev) => new Set(prev).add(tripId));

    try {
      const invite = await createTripInvite(token, tripId, email);
      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                pending_invites: [...trip.pending_invites, invite],
              }
            : trip,
        ),
      );
      setMemberDrafts((prev) => ({ ...prev, [tripId]: "" }));
      setMemberFeedback((prev) => ({
        ...prev,
        [tripId]: `Invite ready: ${invite.invite_url}`,
      }));
      track({
        name: "trip_invite_created",
        props: {
          trip_id: tripId,
          pending_invite_id: invite.id,
        },
      });
    } catch (err) {
      setMemberErrors((prev) => ({
        ...prev,
        [tripId]: err instanceof Error ? err.message : "Failed to add member.",
      }));
    } finally {
      setAddingMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    setTripActionError(null);
    try {
      await deleteTrip(token, trip.id);
      const remaining = trips.filter((row) => row.id !== trip.id);
      setTrips(remaining);
      setSavedItineraries((prev) => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      setConfirmDelete(false);
      if (selectedTripId === trip.id) {
        const nextTripId = remaining[0]?.id ?? null;
        setSelectedTripId(nextTripId);
        onTripSelect?.(nextTripId);
      }
    } catch (err) {
      setTripActionError(
        err instanceof Error ? err.message : "Failed to delete trip.",
      );
    }
  };

  const handleApply = async (tripId: number) => {
    const itinerary =
      pendingItineraries[tripId] ??
      (streams[tripId]?.itinerary
        ? toEditableItinerary(streams[tripId].itinerary)
        : null);
    if (!itinerary) return;

    setDraftActionError(null);
    clearAppliedSuccess(tripId);
    setApplyingIds((prev) => new Set(prev).add(tripId));

    try {
      // Backend contract: persist is full-itinerary replace, not granular stop mutations.
      await applyItinerary(token, tripId, toApiItinerary(itinerary));
      setSavedItineraries((prev) => ({
        ...prev,
        [tripId]: toApiItinerary(itinerary),
      }));
      setAppliedSuccessIds((prev) => new Set(prev).add(tripId));
      const freshTrips = await getTrips(token);
      setTrips(freshTrips);
      const meta = draftPlanMeta[tripId];
      track({
        name: "itinerary_applied",
        props: {
          trip_id: tripId,
          source: meta?.source ?? "unknown",
          source_label: meta?.sourceLabel ?? "Unknown",
          fallback_used: meta?.fallbackUsed ?? false,
        },
      });
      resetStream(tripId);
      setPendingItineraries((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setDraftPlanMeta((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setLockedItemIds((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setFavoriteItemIds((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
    } catch (err) {
      clearAppliedSuccess(tripId);
      setDraftActionError(
        err instanceof Error ? err.message : "Failed to apply itinerary.",
      );
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleRegenerateDraft = async (tripId: number) => {
    const current = pendingItineraries[tripId];
    const controls = regenerationControls[tripId];
    if (!current || !controls) return;

    setDraftActionError(null);
    setRegeneratingIds((prev) => new Set(prev).add(tripId));
    try {
      // Backend contract: locked/favorite references are positional to this exact snapshot.
      const refined = await refineItinerary(token, tripId, {
        current_itinerary: toApiItinerary(current),
        locked_items: buildItemReferences(current, lockedItemIds[tripId] ?? []),
        favorite_items: buildItemReferences(
          current,
          favoriteItemIds[tripId] ?? [],
        ),
        regenerate_day_number: controls.dayNumber,
        regenerate_time_block:
          controls.timeBlock === "full_day" ? undefined : controls.timeBlock,
        variant: controls.variant,
      });
      upsertDraftItinerary(tripId, refined, current);
      track({
        name: "itinerary_regenerated",
        props: {
          trip_id: tripId,
          day_number: controls.dayNumber,
          time_block: controls.timeBlock,
          variant: controls.variant,
        },
      });
    } catch (err) {
      setDraftActionError(
        err instanceof Error ? err.message : "Failed to refine itinerary.",
      );
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleRunAiAssist = async (
    tripId: number,
    request: DraftAiAssistRequest,
  ) => {
    const current = pendingItineraries[tripId];
    if (!current) return;

    const controls = regenerationControls[tripId];
    const payload = getAiAssistPayload(
      current,
      request,
      controls,
      lockedItemIds[tripId] ?? [],
      favoriteItemIds[tripId] ?? [],
    );

    setDraftActionError(null);
    setRegeneratingIds((prev) => new Set(prev).add(tripId));

    try {
      // Backend contract: locked/favorite references are positional to this exact snapshot.
      const refined = await refineItinerary(token, tripId, {
        current_itinerary: toApiItinerary(current),
        locked_items: buildItemReferences(current, payload.lockedIds),
        favorite_items: buildItemReferences(current, payload.favoriteIds),
        regenerate_day_number: request.dayNumber,
        regenerate_time_block:
          payload.timeBlock === "full_day" ? undefined : payload.timeBlock,
        variant: payload.variant,
      });

      upsertDraftItinerary(tripId, refined, current);
      setRegenerationControls((prev) => ({
        ...prev,
        [tripId]: {
          dayNumber: request.dayNumber,
          timeBlock: payload.timeBlock,
          variant: payload.variant,
        },
      }));

      track({
        name: "itinerary_ai_assist_ran",
        props: {
          trip_id: tripId,
          action: request.action,
          day_number: request.dayNumber,
          stop_id: request.stopId ?? null,
          variant: payload.variant,
          time_block: payload.timeBlock,
        },
      });
    } catch (err) {
      setDraftActionError(
        err instanceof Error ? err.message : "Failed to run AI assist.",
      );
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleMoveDraftItem = (
    tripId: number,
    intent: MoveEditableItineraryItemIntent,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.moveItem(tripId, intent);
  };

  const handleAddDraftDay = (tripId: number) => {
    let didAdd = false;
    let nextDayNumber: number | null = null;
    let nextDraftSnapshot: EditableItinerary | null = null;

    setPendingItineraries((prev) => {
      const current = prev[tripId];
      if (!current) return prev;

      const applied = appendEditableItineraryDay(current);
      const addedDay = applied.days[applied.days.length - 1];
      nextDayNumber = addedDay?.day_number ?? null;
      nextDraftSnapshot = applied;
      didAdd = true;

      return {
        ...prev,
        [tripId]: applied,
      };
    });

    if (!didAdd) return;
    clearAppliedSuccess(tripId);

    if (nextDayNumber !== null) {
      setRegenerationControls((prev) => {
        const existing = prev[tripId];
        if (existing) {
          return {
            ...prev,
            [tripId]: {
              ...existing,
              dayNumber: nextDayNumber!,
            },
          };
        }

        const itinerary = nextDraftSnapshot;
        if (!itinerary) return prev;

        return {
          ...prev,
          [tripId]: {
            ...getDefaultRegenerationControls(itinerary),
            dayNumber: nextDayNumber!,
          },
        };
      });
    }

    track({
      name: "overview_add_day_initiated",
      props: {
        trip_id: tripId,
      },
    });
  };

  const handleStartManualDraft = (tripId: number) => {
    const trip = trips.find((row) => row.id === tripId);
    if (!trip) return;

    const previous = pendingItineraries[tripId];
    clearAppliedSuccess(tripId);
    upsertDraftItinerary(tripId, buildManualItineraryDraft(trip), previous);

    track({
      name: "overview_manual_draft_started",
      props: {
        trip_id: tripId,
      },
    });
  };

  const handleUpdateDraftDay = (
    tripId: number,
    dayNumber: number,
    patch: Partial<
      Pick<
        EditableItinerary["days"][number],
        "day_title" | "day_note" | "date" | "day_anchors"
      >
    >,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.updateDay(tripId, dayNumber, patch);
  };

  const handleAddDraftStop = (
    tripId: number,
    dayNumber: number,
    insertAfterIndex?: number,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.addStop(tripId, dayNumber, insertAfterIndex);
  };

  const handleUpdateDraftStop = (
    tripId: number,
    dayNumber: number,
    stopId: string,
    patch: EditableStopPatch,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.updateStop(tripId, dayNumber, stopId, patch);
  };

  const handleDeleteDraftStop = (
    tripId: number,
    dayNumber: number,
    stopId: string,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.deleteStop(tripId, dayNumber, stopId);
  };

  const handleDuplicateDraftStop = (
    tripId: number,
    dayNumber: number,
    stopId: string,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.duplicateStop(tripId, dayNumber, stopId);
  };

  const handleReorderDraftStopWithinDay = (
    tripId: number,
    dayNumber: number,
    sourceIndex: number,
    targetIndex: number,
  ) => {
    clearAppliedSuccess(tripId);
    draftMutations.reorderStopsWithinDay(
      tripId,
      dayNumber,
      sourceIndex,
      targetIndex,
    );
  };

  const handleDuplicateDraftDay = (tripId: number, dayNumber: number) => {
    clearAppliedSuccess(tripId);
    draftMutations.duplicateDay(tripId, dayNumber);
  };

  const handleClearDraftDay = (tripId: number, dayNumber: number) => {
    clearAppliedSuccess(tripId);
    draftMutations.clearDay(tripId, dayNumber);
  };
  const selectedTripIsOwner = Boolean(
    selectedTrip?.members.some(
      (member) => member.email === currentUserEmail && member.role === "owner",
    ),
  );
  const selectedMemberDraft = selectedTrip
    ? (memberDrafts[selectedTrip.id] ?? "")
    : "";
  const selectedMemberError = selectedTrip
    ? (memberErrors[selectedTrip.id] ?? null)
    : null;
  const selectedMemberFeedback = selectedTrip
    ? (memberFeedback[selectedTrip.id] ?? null)
    : null;
  const selectedIsAddingMember = selectedTrip
    ? addingMemberIds.has(selectedTrip.id)
    : false;
  const selectedIsStreaming = selectedTrip
    ? (streams[selectedTrip.id]?.streaming ?? false)
    : false;
  const selectedHasStreamContent = Boolean(
    selectedTrip ? streams[selectedTrip.id]?.text?.trim() : "",
  );
  const selectedIsRegenerating = selectedTrip
    ? regeneratingIds.has(selectedTrip.id)
    : false;
  const selectedIsApplying = selectedTrip
    ? applyingIds.has(selectedTrip.id)
    : false;
  const selectedAppliedSuccess = selectedTrip
    ? appliedSuccessIds.has(selectedTrip.id)
    : false;
  const selectedDraftMutationState = deriveDraftMutationState({
    isApplying: selectedIsApplying,
    hasAppliedSuccess: selectedAppliedSuccess,
    hasDraftError: Boolean(draftActionError),
  });
  const selectedIsAnyGenerating = selectedIsStreaming;
  const selectedDurationDays = selectedTrip
    ? getTripDurationDays(selectedTrip.start_date, selectedTrip.end_date)
    : 0;
  const selectedTripDateLabel = selectedTrip
    ? formatTripDateRange(selectedTrip.start_date, selectedTrip.end_date)
    : "";

  const selectedSummariesLoaded =
    Boolean(selectedTrip) &&
    !selectedPackingSummary.loading &&
    !selectedBudgetSummary.loading &&
    !selectedReservationSummary.loading;

  const selectedReadiness = useMemo(
    () =>
      selectedTrip
        ? buildTripReadinessSnapshot(
            selectedTrip,
            selectedPackingSummary,
            selectedBudgetSummary,
            selectedReservationSummary,
            selectedSummariesLoaded,
            selectedCurrentItinerary,
          )
        : {
            score: null,
            scoreLabel: null,
            knownSignalCount: 0,
            unknownSignalCount: 4,
            unknownState: "no_signals" as const,
          },
    [
      selectedTrip,
      selectedPackingSummary,
      selectedBudgetSummary,
      selectedReservationSummary,
      selectedSummariesLoaded,
      selectedCurrentItinerary,
    ],
  );

  const showWorkspace = Boolean(selectedTrip);

  const handleEditSavedAsDraft = () => {
    if (!selectedTrip || !selectedSavedItinerary) return;

    track({
      name: "overview_edit_initiated",
      props: {
        trip_id: selectedTrip.id,
      },
    });

    upsertDraftItinerary(
      selectedTrip.id,
      selectedSavedItinerary,
      selectedPendingItinerary ?? undefined,
    );
    clearAppliedSuccess(selectedTrip.id);
  };

  const handleShareTrip = async () => {
    if (!selectedTrip) return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedTrip.title,
          text: `Join the plan for ${selectedTrip.destination}.`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      track({
        name: "trip_share_clicked",
        props: { trip_id: selectedTrip.id },
      });
    } catch {
      // Sharing is user-cancelable; keep the trip page calm.
    }
  };

  const actionInputs = useMemo((): TripActionDerivationInput => {
    if (!selectedTrip) return { trip: null };
    return {
      trip: selectedTrip,
      actorEmail: currentUserEmail,
      packing: selectedPackingSummary,
      budget: selectedBudgetSummary,
      reservations: selectedReservationSummary,
      summariesLoaded: selectedSummariesLoaded,
      itinerary: selectedCurrentItinerary,
      workspace: {
        tripActionError,
        draftActionError,
        streamError: selectedStreamError,
        hasPendingDraft: selectedPendingItinerary !== null,
        isApplyingItinerary: selectedIsApplying,
        unreadActivityCount: selectedUnreadCount,
        activityMuted: selectedTripIsMuted,
      },
    };
  }, [
    selectedTrip,
    currentUserEmail,
    selectedPackingSummary,
    selectedBudgetSummary,
    selectedReservationSummary,
    selectedSummariesLoaded,
    selectedCurrentItinerary,
    tripActionError,
    draftActionError,
    selectedStreamError,
    selectedPendingItinerary,
    selectedIsApplying,
    selectedUnreadCount,
    selectedTripIsMuted,
  ]);

  const actionItems = useMemo(
    () => deriveTripActionItems(actionInputs),
    [actionInputs],
  );
  const actionability = useMemo(
    () => buildTripActionabilityModel(actionInputs),
    [actionInputs],
  );

  return {
    status: {
      loading,
      error,
      tripActionError,
      draftActionError,
      /** Combined banner for global workspace chrome (trip + draft failures). */
      actionError: tripActionError ?? draftActionError,
    },
    selection: {
      trips,
      selectedTripId,
      selectedTrip,
      activeTab,
      selectTrip,
      openWorkspaceTab,
    },
    derived: {
      selectedTripStatus,
      selectedPackingSummary,
      selectedBudgetSummary,
      selectedReservationSummary,
      selectedSummariesLoaded,
      selectedReadiness,
      showWorkspace,
      selectedDurationDays,
      selectedTripDateLabel,
      selectedHasSavedItinerary,
      selectedActivities,
      selectedActivityStripItems: selectedActivityModel?.stripItems ?? [],
      selectedActivityHasUnseenChanges:
        selectedActivityModel?.hasUnseenChanges ?? false,
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
      actionInputs,
      actionItems,
      actionability,
    },
    draft: {
      selectedSavedItinerary,
      selectedPendingItinerary,
      selectedDraftPlanMeta,
      selectedControls,
      lockedItemIds,
      favoriteItemIds,
    },
    activity: {
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
    },
    actions: {
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
      setMemberDrafts,
      setLockedItemIds,
      setFavoriteItemIds,
      handleAddMember,
      startStream,
      resetStream,
      handleEditSavedAsDraft,
      handleShareTrip,
    },
    ui: { isMobileLayout, confirmDelete, editingTrip },
  };
}

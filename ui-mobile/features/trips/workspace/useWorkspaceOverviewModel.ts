import { useEffect, useMemo, useRef, useState } from "react";

import { useApplyItineraryMutation, useSavedItineraryQuery } from "@/features/ai/hooks";
import type { Itinerary, ItineraryItem } from "@/features/ai/api";
import type { StreamState } from "@/features/ai/useStreamingItinerary";
import { ApiError } from "@/shared/api/client";
import type { TripOnTripSnapshot } from "../types";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
} from "./adapters";
import type { StopEditPatch } from "./StopEditSheet";
import {
  buildItineraryTabDays,
  type ItineraryFilterKey,
  type ItineraryTabDay,
} from "./itineraryPresentation";
import {
  buildWorkspaceCommandModel,
  type WorkspaceCommandModel,
} from "./workspaceCommandModel";
import {
  buildOverviewItineraryDayPreviews,
  type OverviewItineraryDayPreview,
} from "./overviewItineraryPreview";

type Options = {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel | null;
  onTripSnapshot: TripOnTripSnapshot | null;
  streamState: StreamState | undefined;
  onCancelStream: () => void;
};

export type WorkspaceOverviewModel = {
  command: WorkspaceCommandModel;
  itinerary: Itinerary | null;
  selectedStop: ItineraryItem | null;
  editingStop: { dayIndex: number; stopIndex: number | null } | null;
  regeneratingDayIndex: number | null;
  isItineraryLoading: boolean;
  isItineraryMissing: boolean;
  isItineraryDirty: boolean;
  isSavingItinerary: boolean;
  isStreaming: boolean;
  itineraryError: string | null;
  streamText: string | null;
  itineraryFilter: ItineraryFilterKey;
  itineraryDays: ItineraryTabDay[];
  itineraryDayPreviews: OverviewItineraryDayPreview[];
  showFullItinerary: boolean;
  setItineraryFilter: (value: ItineraryFilterKey) => void;
  setShowFullItinerary: (value: boolean) => void;
  setEditingStop: (value: { dayIndex: number; stopIndex: number | null } | null) => void;
  setRegeneratingDayIndex: (value: number | null) => void;
  handleSaveStop: (patch: StopEditPatch) => void;
  handleDeleteStop: () => void;
  handleAcceptRefinement: (refinedItinerary: Itinerary) => void;
  handlePublishChanges: () => Promise<void>;
};

export function useWorkspaceOverviewModel({
  trip,
  summary,
  collaboration,
  onTripSnapshot,
  streamState,
  onCancelStream,
}: Options): WorkspaceOverviewModel {
  const itineraryQuery = useSavedItineraryQuery(trip.id);
  const { mutateAsync: saveItinerary, isPending: isSavingItinerary } =
    useApplyItineraryMutation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editableItinerary, setEditableItinerary] = useState<Itinerary | null>(null);
  const [lastSyncedSaved, setLastSyncedSaved] = useState<string | null>(null);
  const [editingStop, setEditingStop] = useState<{
    dayIndex: number;
    stopIndex: number | null;
  } | null>(null);
  const [regeneratingDayIndex, setRegeneratingDayIndex] = useState<number | null>(null);
  const [itineraryFilter, setItineraryFilter] = useState<ItineraryFilterKey>("all");
  const [showFullItinerary, setShowFullItinerary] = useState(false);
  const applyInFlight = useRef(false);

  const completedItinerary: Itinerary | null = streamState?.itinerary ?? null;
  const isStillStreaming = streamState?.streaming ?? false;
  const streamError = streamState?.error ?? null;
  const savedItinerary = itineraryQuery.data ?? null;
  const savedSerialized = useMemo(
    () => (savedItinerary ? serializeItinerary(savedItinerary) : null),
    [savedItinerary],
  );
  const editableSerialized = useMemo(
    () => (editableItinerary ? serializeItinerary(editableItinerary) : null),
    [editableItinerary],
  );
  const isDirty = Boolean(
    savedSerialized && editableSerialized && savedSerialized !== editableSerialized,
  );
  const isMissing =
    itineraryQuery.isError &&
    itineraryQuery.error instanceof ApiError &&
    itineraryQuery.error.status === 404;
  const itineraryError =
    streamError ??
    saveError ??
    (itineraryQuery.isError && !isMissing
      ? "We could not load the itinerary right now. Try again in a moment."
      : null);
  const selectedStop =
    editingStop && editableItinerary
      ? editableItinerary.days[editingStop.dayIndex]?.items[
          editingStop.stopIndex ?? -1
        ] ?? null
      : null;

  useEffect(() => {
    setEditableItinerary(null);
    setLastSyncedSaved(null);
    setEditingStop(null);
    setRegeneratingDayIndex(null);
    setItineraryFilter("all");
    setSaveError(null);
    setShowFullItinerary(false);
    applyInFlight.current = false;
  }, [trip.id]);

  useEffect(() => {
    if (!savedItinerary || !savedSerialized) {
      setEditableItinerary(null);
      setLastSyncedSaved(null);
      setEditingStop(null);
      return;
    }

    if (lastSyncedSaved !== savedSerialized) {
      setEditableItinerary(savedItinerary);
      setLastSyncedSaved(savedSerialized);
      setEditingStop(null);
    }
  }, [lastSyncedSaved, savedItinerary, savedSerialized]);

  useEffect(() => {
    if (!completedItinerary || isStillStreaming || applyInFlight.current) return;

    applyInFlight.current = true;
    setSaveError(null);

    saveItinerary({ tripId: trip.id, itinerary: completedItinerary, source: "ai_stream" })
      .then(() => {
        setEditableItinerary(completedItinerary);
        setLastSyncedSaved(serializeItinerary(completedItinerary));
        onCancelStream();
        applyInFlight.current = false;
      })
      .catch(() => {
        setSaveError("We couldn't save the itinerary. Try again.");
        onCancelStream();
        applyInFlight.current = false;
      });
    // completedItinerary identity only changes once per stream completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedItinerary, isStillStreaming, trip.id]);

  function handleAddStop(dayIndex: number, patch: StopEditPatch) {
    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      if (!day) return current;

      const nextDays = [...current.days];
      nextDays[dayIndex] = {
        ...day,
        items: [...day.items, createStopFromPatch(patch)],
      };
      return { ...current, days: nextDays };
    });
  }

  function handleUpdateStop(dayIndex: number, stopIndex: number, patch: StopEditPatch) {
    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      const stop = day?.items[stopIndex];
      if (!day || !stop) return current;

      const nextItems = [...day.items];
      nextItems[stopIndex] = { ...stop, ...patch };
      const nextDays = [...current.days];
      nextDays[dayIndex] = { ...day, items: nextItems };
      return { ...current, days: nextDays };
    });
  }

  function handleDeleteStop() {
    if (!editingStop || editingStop.stopIndex == null) return;
    const { dayIndex, stopIndex } = editingStop;

    setEditableItinerary((current) => {
      if (!current) return current;
      const day = current.days[dayIndex];
      if (!day?.items[stopIndex]) return current;

      const nextDays = [...current.days];
      nextDays[dayIndex] = {
        ...day,
        items: day.items.filter((_item, index) => index !== stopIndex),
      };
      return { ...current, days: nextDays };
    });
    setEditingStop(null);
  }

  function handleSaveStop(patch: StopEditPatch) {
    if (!editingStop) return;

    if (editingStop.stopIndex == null) {
      handleAddStop(editingStop.dayIndex, patch);
    } else {
      handleUpdateStop(editingStop.dayIndex, editingStop.stopIndex, patch);
    }
    setEditingStop(null);
  }

  function handleAcceptRefinement(refinedItinerary: Itinerary) {
    if (!editableItinerary) return;
    setEditableItinerary(refinedItinerary);
    setRegeneratingDayIndex(null);
  }

  async function handlePublishChanges() {
    if (!editableItinerary || !isDirty) return;

    setSaveError(null);
    try {
      await saveItinerary({
        tripId: trip.id,
        itinerary: editableItinerary,
        source: "manual_edit",
      });
      setLastSyncedSaved(serializeItinerary(editableItinerary));
    } catch {
      setSaveError("We couldn't publish your itinerary changes. Try again.");
    }
  }

  const visibleItinerary = editableItinerary ?? savedItinerary;
  const itineraryDays = useMemo(
    () => buildItineraryTabDays(visibleItinerary, itineraryFilter),
    [itineraryFilter, visibleItinerary],
  );
  const itineraryDayPreviews = useMemo(
    () => buildOverviewItineraryDayPreviews(visibleItinerary, { maxDays: 3 }),
    [visibleItinerary],
  );
  const command = useMemo(
    () =>
      buildWorkspaceCommandModel({
        trip,
        summary,
        collaboration,
        onTripSnapshot,
        itineraryState: {
          itinerary: visibleItinerary,
          isMissing,
          isLoading: itineraryQuery.isLoading,
          isDirty,
          isSaving: isSavingItinerary,
          isStreaming: isStillStreaming,
        },
      }),
    [
      collaboration,
      isDirty,
      isMissing,
      isSavingItinerary,
      isStillStreaming,
      itineraryQuery.isLoading,
      onTripSnapshot,
      summary,
      trip,
      visibleItinerary,
    ],
  );

  return {
    command,
    itinerary: visibleItinerary,
    selectedStop,
    editingStop,
    regeneratingDayIndex,
    isItineraryLoading: itineraryQuery.isLoading,
    isItineraryMissing: isMissing,
    isItineraryDirty: isDirty,
    isSavingItinerary,
    isStreaming: isStillStreaming,
    itineraryError,
    streamText: streamState?.text ?? null,
    itineraryFilter,
    itineraryDays,
    itineraryDayPreviews,
    showFullItinerary,
    setItineraryFilter,
    setShowFullItinerary,
    setEditingStop,
    setRegeneratingDayIndex,
    handleSaveStop,
    handleDeleteStop,
    handleAcceptRefinement,
    handlePublishChanges,
  };
}

function serializeItinerary(itinerary: Itinerary): string {
  return JSON.stringify(sortObjectKeys(itinerary));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function createStopFromPatch(patch: StopEditPatch): ItineraryItem {
  return {
    id: null,
    time: patch.time,
    title: patch.title,
    location: patch.location,
    lat: null,
    lon: null,
    notes: patch.notes,
    cost_estimate: null,
    status: "planned",
    handled_by: null,
    booked_by: null,
  };
}

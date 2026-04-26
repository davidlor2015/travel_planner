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
import type { StopFormValue } from "./StopFormSheet";
import {
  addDayToItinerary,
  addStopToDay,
  buildDayOptions,
  buildTimeOptions,
  deleteDayFromItinerary,
  deleteStopFromItinerary,
  getStopMoveAvailability,
  moveStopToDay,
  moveStopWithinDay,
  updateStopInItinerary,
  type DayOption,
  type StopSource,
  type TimeOption,
} from "./itineraryDraftMutations";
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
  dayOptions: DayOption[];
  timeOptions: TimeOption[];
  stopMoveAvailability: ReturnType<typeof getStopMoveAvailability>;
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
  handleSaveStop: (value: StopFormValue) => void;
  handleDeleteStop: () => void;
  handleAddDay: () => void;
  handleDeleteDay: (dayIndex: number) => void;
  handleMoveStopUp: () => void;
  handleMoveStopDown: () => void;
  handleMoveStopToPreviousDay: () => void;
  handleMoveStopToNextDay: () => void;
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
  const selectedStopSource: StopSource | null = useMemo(
    () =>
      editingStop?.stopIndex == null
        ? null
        : { dayIndex: editingStop.dayIndex, stopIndex: editingStop.stopIndex },
    [editingStop],
  );
  const dayOptions = useMemo(
    () => buildDayOptions((editableItinerary ?? savedItinerary)?.days ?? []),
    [editableItinerary, savedItinerary],
  );
  const timeOptions = useMemo(() => buildTimeOptions(30), []);
  const stopMoveAvailability = useMemo(
    () => getStopMoveAvailability(editableItinerary ?? savedItinerary, selectedStopSource),
    [editableItinerary, savedItinerary, selectedStopSource],
  );

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

  function handleAddStop(dayIndex: number, value: StopFormValue) {
    setEditableItinerary((current) => {
      if (!current) return current;
      return addStopToDay(current, dayIndex, createStopFromValue(value));
    });
  }

  function handleUpdateStop(source: StopSource, value: StopFormValue) {
    setEditableItinerary((current) => {
      if (!current) return current;
      return updateStopInItinerary(
        current,
        source,
        {
          time: value.time,
          title: value.title,
          location: value.location,
          notes: value.notes,
        },
        value.dayIndex,
      );
    });
  }

  function handleDeleteStop() {
    if (!selectedStopSource) return;

    setEditableItinerary((current) => {
      if (!current) return current;
      return deleteStopFromItinerary(current, selectedStopSource);
    });
    setEditingStop(null);
  }

  function handleAddDay() {
    setEditableItinerary((current) => {
      if (!current) return current;
      return addDayToItinerary(current);
    });
  }

  function handleDeleteDay(dayIndex: number) {
    setEditableItinerary((current) => {
      if (!current?.days[dayIndex] || current.days.length <= 1) return current;
      return deleteDayFromItinerary(current, dayIndex);
    });
    setEditingStop(null);
    setRegeneratingDayIndex((current) => {
      if (current === null) return current;
      if (current === dayIndex) return null;
      return current > dayIndex ? current - 1 : current;
    });
  }

  function handleSaveStop(value: StopFormValue) {
    if (!editingStop) return;

    if (editingStop.stopIndex == null) {
      handleAddStop(value.dayIndex, value);
    } else {
      handleUpdateStop(
        { dayIndex: editingStop.dayIndex, stopIndex: editingStop.stopIndex },
        value,
      );
    }
    setEditingStop(null);
  }

  function handleMoveStopUp() {
    if (!editableItinerary || !selectedStopSource || !stopMoveAvailability.canMoveUp) return;
    setEditableItinerary(moveStopWithinDay(editableItinerary, selectedStopSource, "up"));
    setEditingStop({
      dayIndex: selectedStopSource.dayIndex,
      stopIndex: selectedStopSource.stopIndex - 1,
    });
  }

  function handleMoveStopDown() {
    if (!editableItinerary || !selectedStopSource || !stopMoveAvailability.canMoveDown) return;
    setEditableItinerary(moveStopWithinDay(editableItinerary, selectedStopSource, "down"));
    setEditingStop({
      dayIndex: selectedStopSource.dayIndex,
      stopIndex: selectedStopSource.stopIndex + 1,
    });
  }

  function handleMoveStopToPreviousDay() {
    if (!editableItinerary || !selectedStopSource || !stopMoveAvailability.canMoveToPreviousDay) return;
    const targetDayIndex = selectedStopSource.dayIndex - 1;
    const targetStopIndex = editableItinerary.days[targetDayIndex]?.items.length ?? 0;
    setEditableItinerary(moveStopToDay(editableItinerary, selectedStopSource, targetDayIndex));
    setEditingStop({ dayIndex: targetDayIndex, stopIndex: targetStopIndex });
  }

  function handleMoveStopToNextDay() {
    if (!editableItinerary || !selectedStopSource || !stopMoveAvailability.canMoveToNextDay) return;
    const targetDayIndex = selectedStopSource.dayIndex + 1;
    const targetStopIndex = editableItinerary.days[targetDayIndex]?.items.length ?? 0;
    setEditableItinerary(moveStopToDay(editableItinerary, selectedStopSource, targetDayIndex));
    setEditingStop({ dayIndex: targetDayIndex, stopIndex: targetStopIndex });
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
    dayOptions,
    timeOptions,
    stopMoveAvailability,
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
    handleAddDay,
    handleDeleteDay,
    handleMoveStopUp,
    handleMoveStopDown,
    handleMoveStopToPreviousDay,
    handleMoveStopToNextDay,
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

function createStopFromValue(value: StopFormValue): ItineraryItem {
  return {
    id: null,
    time: value.time,
    title: value.title,
    location: value.location,
    lat: null,
    lon: null,
    notes: value.notes,
    cost_estimate: null,
    status: "planned",
    handled_by: null,
    booked_by: null,
  };
}

import type { Dispatch, SetStateAction } from 'react';

import {
  addEditableItineraryStop,
  appendEditableItineraryDay,
  clearEditableItineraryDay,
  deleteEditableItineraryStop,
  duplicateEditableItineraryDay,
  duplicateEditableItineraryStop,
  moveEditableItineraryItemByIntent,
  reorderEditableItineraryStopWithinDay,
  updateEditableItineraryDay,
  updateEditableItineraryStop,
  type EditableItinerary,
  type EditableStopPatch,
  type MoveEditableItineraryItemIntent,
  type MoveEditableItineraryItemOutcome,
} from '../itineraryDraft';

type PendingDraftState = Record<number, EditableItinerary>;

type UpdatePendingDrafts = Dispatch<SetStateAction<PendingDraftState>>;

function mutateTripDraft(
  setPendingItineraries: UpdatePendingDrafts,
  tripId: number,
  mutate: (itinerary: EditableItinerary) => EditableItinerary,
) {
  setPendingItineraries((prev) => {
    const current = prev[tripId];
    if (!current) return prev;
    return {
      ...prev,
      [tripId]: mutate(current),
    };
  });
}

export function createItineraryDraftMutations(
  setPendingItineraries: UpdatePendingDrafts,
) {
  return {
    addDay(tripId: number) {
      mutateTripDraft(setPendingItineraries, tripId, appendEditableItineraryDay);
    },
    updateDay(
      tripId: number,
      dayNumber: number,
      patch: Partial<
        Pick<
          EditableItinerary["days"][number],
          "day_title" | "day_note" | "date" | "day_anchors"
        >
      >,
    ) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        updateEditableItineraryDay(current, dayNumber, patch),
      );
    },
    addStop(tripId: number, dayNumber: number, insertAfterIndex?: number) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        addEditableItineraryStop(current, dayNumber, { insertAfterIndex }),
      );
    },
    /**
     * Insert a pre-filled stop — used when something external (e.g. a
     * reservation being pinned) already knows the title/time/location and
     * wants the new stop to appear ready, not as an empty "New stop".
     */
    addStopWithInitial(
      tripId: number,
      dayNumber: number,
      initial: EditableStopPatch,
      insertAfterIndex?: number,
    ) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        addEditableItineraryStop(current, dayNumber, {
          insertAfterIndex,
          initial,
        }),
      );
    },
    updateStop(
      tripId: number,
      dayNumber: number,
      stopId: string,
      patch: EditableStopPatch,
    ) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        updateEditableItineraryStop(current, dayNumber, stopId, patch),
      );
    },
    deleteStop(tripId: number, dayNumber: number, stopId: string) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        deleteEditableItineraryStop(current, dayNumber, stopId),
      );
    },
    duplicateStop(tripId: number, dayNumber: number, stopId: string) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        duplicateEditableItineraryStop(current, dayNumber, stopId),
      );
    },
    reorderStopsWithinDay(
      tripId: number,
      dayNumber: number,
      sourceIndex: number,
      targetIndex: number,
    ) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        reorderEditableItineraryStopWithinDay(current, {
          dayNumber,
          sourceIndex,
          targetIndex,
        }),
      );
    },
    duplicateDay(tripId: number, dayNumber: number) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        duplicateEditableItineraryDay(current, dayNumber),
      );
    },
    clearDay(tripId: number, dayNumber: number) {
      mutateTripDraft(setPendingItineraries, tripId, (current) =>
        clearEditableItineraryDay(current, dayNumber),
      );
    },
    moveItem(
      tripId: number,
      intent: MoveEditableItineraryItemIntent,
    ): MoveEditableItineraryItemOutcome | null {
      let outcome: MoveEditableItineraryItemOutcome | null = null;
      mutateTripDraft(setPendingItineraries, tripId, (current) => {
        outcome = moveEditableItineraryItemByIntent(current, intent);
        return outcome.itinerary;
      });
      return outcome;
    },
  };
}

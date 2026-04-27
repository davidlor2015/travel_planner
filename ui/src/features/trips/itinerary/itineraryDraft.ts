// Path: ui/src/features/trips/itinerary/itineraryDraft.ts
// Summary: Implements itineraryDraft module logic.

import type {
  DayPlan,
  Itinerary,
  ItineraryItem,
  ItineraryStopStatus,
} from '../../../shared/api/ai';

export type RefinementVariant = 'faster_pace' | 'cheaper' | 'more_local' | 'less_walking';
export type RefinementTimeBlock = 'full_day' | 'morning' | 'afternoon' | 'evening';
export type AiAssistAction =
  | 'regenerate_day'
  | 'stop_alternatives'
  | 'fill_gaps'
  | 'rebalance_pacing'
  | 'route_optimization';

export interface DraftAiAssistRequest {
  action: AiAssistAction;
  dayNumber: number;
  stopId?: string;
}

export interface EditableItineraryItem extends ItineraryItem {
  client_id: string;
}

export interface StopOwnershipMetadata {
  handledBy: string | null;
  bookedBy: string | null;
}

export type EditableStopPatch = Partial<
  Omit<EditableItineraryItem, 'client_id'>
>;

export interface AddStopOptions {
  insertAfterIndex?: number;
  initial?: EditableStopPatch;
}

export interface ReorderStopsWithinDayInput {
  dayNumber: number;
  sourceIndex: number;
  targetIndex: number;
}

export interface MoveEditableItineraryItemIntent {
  sourceDayNumber: number;
  sourceIndex: number;
  targetDayNumber: number;
  targetIndex: number;
}

export type MoveEditableItineraryItemOutcome =
  | {
      kind: 'success';
      itinerary: EditableItinerary;
      movedItemId: string;
    }
  | {
      kind: 'no_op';
      reason: 'same_position';
      itinerary: EditableItinerary;
    }
  | {
      kind: 'invalid';
      reason:
        | 'source_day_missing'
        | 'target_day_missing'
        | 'source_index_out_of_range'
        | 'target_index_out_of_range';
      itinerary: EditableItinerary;
    };

export type DayAnchorType = 'flight' | 'hotel_checkin';

export interface DayAnchor {
  id: string;
  type: DayAnchorType;
  label: string;
  time: string | null;
  note: string | null;
  handled_by: string | null;
  booked_by: string | null;
}

export interface EditableDayPlan extends Omit<DayPlan, 'items'> {
  day_title: string | null;
  day_note: string | null;
  day_anchors: DayAnchor[];
  items: EditableItineraryItem[];
}

export interface EditableItinerary extends Omit<Itinerary, 'days'> {
  days: EditableDayPlan[];
}

export interface ItemReference {
  day_number: number;
  item_index: number;
}

const OWNERSHIP_TOKEN_START = '[ownership:';
const OWNERSHIP_TOKEN_END = ']';

function normalizeOwnershipValue(value: string | null | undefined): string | null {
  const next = value?.trim() ?? '';
  return next.length > 0 ? next : null;
}

function parseOwnershipToken(token: string): StopOwnershipMetadata {
  const parts = token
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  let handledBy: string | null = null;
  let bookedBy: string | null = null;
  for (const part of parts) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    const value = normalizeOwnershipValue(rest.join('=').trim());
    if (key === 'handledBy') handledBy = value;
    if (key === 'bookedBy') bookedBy = value;
  }
  return { handledBy, bookedBy };
}

export function extractStopOwnershipMetadata(
  notes: string | null | undefined,
  explicitOwnership?: Partial<StopOwnershipMetadata> | null,
): {
  metadata: StopOwnershipMetadata;
  plainNotes: string | null;
} {
  const explicitHandled = normalizeOwnershipValue(explicitOwnership?.handledBy);
  const explicitBooked = normalizeOwnershipValue(explicitOwnership?.bookedBy);
  const raw = notes?.trim() ?? '';
  if (!raw) {
    return {
      metadata: { handledBy: explicitHandled, bookedBy: explicitBooked },
      plainNotes: null,
    };
  }

  const start = raw.lastIndexOf(OWNERSHIP_TOKEN_START);
  const end = raw.endsWith(OWNERSHIP_TOKEN_END) ? raw.length - 1 : -1;
  if (start === -1 || end === -1 || end <= start) {
    return {
      metadata: { handledBy: explicitHandled, bookedBy: explicitBooked },
      plainNotes: raw,
    };
  }

  const tokenBody = raw.slice(start + OWNERSHIP_TOKEN_START.length, end).trim();
  const parsedMetadata = parseOwnershipToken(tokenBody);
  const metadata = {
    handledBy: explicitHandled ?? parsedMetadata.handledBy,
    bookedBy: explicitBooked ?? parsedMetadata.bookedBy,
  };
  const plainNotes = normalizeOwnershipValue(raw.slice(0, start).trim());

  return { metadata, plainNotes };
}

export function applyStopOwnershipMetadata(
  plainNotes: string | null | undefined,
  metadata: StopOwnershipMetadata,
): string | null {
  void metadata;
  const cleanNotes = normalizeOwnershipValue(plainNotes);
  return cleanNotes;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function nextIsoDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + 1);
  return toIsoDate(parsed);
}

function itemFingerprint(item: ItineraryItem): string {
  return [
    item.time,
    item.title,
    item.location,
    item.notes,
    item.cost_estimate,
    item.status ?? '',
  ]
    .map((value) => value ?? '')
    .join('|');
}

export function normalizeStopStatus(
  value: string | null | undefined,
): ItineraryStopStatus {
  if (value === 'confirmed' || value === 'skipped' || value === 'planned') {
    return value;
  }
  return 'planned';
}

function createDraftItemId(): string {
  return `draft-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDayAnchorId(): string {
  return `day-anchor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneStopWithNewId(item: EditableItineraryItem): EditableItineraryItem {
  return {
    ...item,
    client_id: createDraftItemId(),
  };
}

function cloneDays(itinerary: EditableItinerary): EditableDayPlan[] {
  return itinerary.days.map((day) => ({
    ...day,
    day_anchors: day.day_anchors.map((anchor) => ({ ...anchor })),
    items: [...day.items],
  }));
}

function createEmptyDraftStop(
  overrides?: Partial<Omit<EditableItineraryItem, 'client_id'>>,
): EditableItineraryItem {
  return {
    client_id: createDraftItemId(),
    time: null,
    title: 'New stop',
    location: null,
    lat: null,
    lon: null,
    notes: null,
    cost_estimate: null,
    status: 'planned',
    ...overrides,
  };
}

function moveIndexWithinArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...items];

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;

  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
  return next;
}

function normalizeDayNumbers(days: EditableDayPlan[]): EditableDayPlan[] {
  return days.map((day, index) => ({
    ...day,
    day_number: index + 1,
  }));
}

export function toEditableItinerary(
  itinerary: Itinerary,
  previous?: EditableItinerary,
): EditableItinerary {
  const previousIdByFingerprint = new Map<string, string[]>();
  const previousDayMetaByNumber = new Map<
    number,
    { day_title: string | null; day_note: string | null; day_anchors: DayAnchor[] }
  >();

  if (previous) {
    for (const day of previous.days) {
      previousDayMetaByNumber.set(day.day_number, {
        day_title: day.day_title,
        day_note: day.day_note,
        day_anchors: (day.day_anchors ?? []).map((anchor) => ({ ...anchor })),
      });

      for (const item of day.items) {
        const fingerprint = itemFingerprint(item);
        const existing = previousIdByFingerprint.get(fingerprint);
        if (existing) {
          existing.push(item.client_id);
        } else {
          previousIdByFingerprint.set(fingerprint, [item.client_id]);
        }
      }
    }
  }

  let counter = 0;

  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      day_title: previousDayMetaByNumber.get(day.day_number)?.day_title ?? null,
      day_note: previousDayMetaByNumber.get(day.day_number)?.day_note ?? null,
      day_anchors:
        previousDayMetaByNumber.get(day.day_number)?.day_anchors.map((anchor) => ({
          ...anchor,
        })) ??
        (day.anchors ?? []).map((anchor) => ({
          id: createDayAnchorId(),
          type: anchor.type,
          label: anchor.label,
          time: anchor.time ?? null,
          note: anchor.note ?? null,
          handled_by: anchor.handled_by ?? null,
          booked_by: anchor.booked_by ?? null,
        })),
      items: day.items.map((item) => {
        const fingerprint = itemFingerprint(item);
        const retained = previousIdByFingerprint.get(fingerprint)?.shift();
        counter += 1;
        return {
          ...item,
          client_id: retained ?? `draft-item-${counter}`,
        };
      }),
    })),
  };
}

export function toApiItinerary(itinerary: EditableItinerary): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      day_number: day.day_number,
      date: day.date,
      day_title: day.day_title,
      day_note: day.day_note,
      anchors: day.day_anchors.map((anchor) => ({
        type: anchor.type,
        label: anchor.label,
        time: anchor.time,
        note: anchor.note,
        handled_by: anchor.handled_by,
        booked_by: anchor.booked_by,
      })),
      items: day.items.map((item) => ({
        time: item.time,
        title: item.title,
        location: item.location,
        lat: item.lat,
        lon: item.lon,
        notes: item.notes,
        cost_estimate: item.cost_estimate,
        status: item.status ?? null,
        handled_by: item.handled_by ?? null,
        booked_by: item.booked_by ?? null,
      })),
    })),
  };
}

export function preserveSelectionIds(
  previous: EditableItinerary,
  next: EditableItinerary,
  selectedIds: string[],
): string[] {
  const selectedFingerprints = new Set<string>();

  for (const day of previous.days) {
    for (const item of day.items) {
      if (selectedIds.includes(item.client_id)) {
        selectedFingerprints.add(itemFingerprint(item));
      }
    }
  }

  const nextIds: string[] = [];
  for (const day of next.days) {
    for (const item of day.items) {
      if (selectedFingerprints.has(itemFingerprint(item))) {
        nextIds.push(item.client_id);
      }
    }
  }

  return nextIds;
}

export function moveEditableItineraryItemByIntent(
  itinerary: EditableItinerary,
  intent: MoveEditableItineraryItemIntent,
): MoveEditableItineraryItemOutcome {
  const {
    sourceDayNumber,
    sourceIndex,
    targetDayNumber,
    targetIndex,
  } = intent;
  const sourceDay = itinerary.days.find((day) => day.day_number === sourceDayNumber);
  if (!sourceDay) {
    return {
      kind: 'invalid',
      reason: 'source_day_missing',
      itinerary,
    };
  }
  const targetDay = itinerary.days.find((day) => day.day_number === targetDayNumber);
  if (!targetDay) {
    return {
      kind: 'invalid',
      reason: 'target_day_missing',
      itinerary,
    };
  }
  if (sourceIndex < 0 || sourceIndex >= sourceDay.items.length) {
    return {
      kind: 'invalid',
      reason: 'source_index_out_of_range',
      itinerary,
    };
  }
  const maxTargetIndex = targetDay.items.length;
  if (targetIndex < 0 || targetIndex > maxTargetIndex) {
    return {
      kind: 'invalid',
      reason: 'target_index_out_of_range',
      itinerary,
    };
  }
  if (
    sourceDayNumber === targetDayNumber &&
    (targetIndex === sourceIndex || targetIndex === sourceIndex + 1)
  ) {
    return {
      kind: 'no_op',
      reason: 'same_position',
      itinerary,
    };
  }

  const next: EditableItinerary = {
    ...itinerary,
    days: itinerary.days.map((day) => ({ ...day, items: [...day.items] })),
  };

  const nextSourceDay = next.days.find((day) => day.day_number === sourceDayNumber);
  const nextTargetDay = next.days.find((day) => day.day_number === targetDayNumber);
  if (!nextSourceDay || !nextTargetDay) {
    return {
      kind: 'invalid',
      reason: nextSourceDay ? 'target_day_missing' : 'source_day_missing',
      itinerary,
    };
  }

  const [movedItem] = nextSourceDay.items.splice(sourceIndex, 1);
  if (!movedItem) {
    return {
      kind: 'invalid',
      reason: 'source_index_out_of_range',
      itinerary,
    };
  }

  let insertionIndex = targetIndex;
  if (sourceDayNumber === targetDayNumber && sourceIndex < targetIndex) {
    insertionIndex -= 1;
  }

  nextTargetDay.items.splice(insertionIndex, 0, movedItem);
  return {
    kind: 'success',
    itinerary: next,
    movedItemId: movedItem.client_id,
  };
}

export function moveEditableItineraryItem(
  itinerary: EditableItinerary,
  sourceDayNumber: number,
  sourceIndex: number,
  targetDayNumber: number,
  targetIndex: number,
): EditableItinerary {
  return moveEditableItineraryItemByIntent(itinerary, {
    sourceDayNumber,
    sourceIndex,
    targetDayNumber,
    targetIndex,
  }).itinerary;
}

export function buildItemReferences(
  itinerary: EditableItinerary,
  selectedIds: string[],
): ItemReference[] {
  const selected = new Set(selectedIds);
  const references: ItemReference[] = [];

  for (const day of itinerary.days) {
    day.items.forEach((item, itemIndex) => {
      if (selected.has(item.client_id)) {
        references.push({
          day_number: day.day_number,
          item_index: itemIndex,
        });
      }
    });
  }

  return references;
}

export function appendEditableItineraryDay(
  itinerary: EditableItinerary,
): EditableItinerary {
  const lastDay = itinerary.days[itinerary.days.length - 1];
  const nextDayNumber = (lastDay?.day_number ?? 0) + 1;

  return {
    ...itinerary,
    days: [
      ...itinerary.days,
      {
        day_number: nextDayNumber,
        date: nextIsoDate(lastDay?.date ?? null),
        day_title: null,
        day_note: null,
        day_anchors: [],
        items: [],
      },
    ],
  };
}

export function updateEditableItineraryDay(
  itinerary: EditableItinerary,
  dayNumber: number,
  patch: Partial<
    Pick<EditableDayPlan, 'day_title' | 'day_note' | 'date' | 'day_anchors'>
  >,
): EditableItinerary {
  let didUpdate = false;
  const days = itinerary.days.map((day) => {
    if (day.day_number !== dayNumber) return day;
    didUpdate = true;
    return {
      ...day,
      ...patch,
    };
  });

  if (!didUpdate) return itinerary;
  return {
    ...itinerary,
    days,
  };
}

export function addEditableItineraryStop(
  itinerary: EditableItinerary,
  dayNumber: number,
  options?: AddStopOptions,
): EditableItinerary {
  const days = cloneDays(itinerary);
  const day = days.find((candidate) => candidate.day_number === dayNumber);
  if (!day) return itinerary;

  const nextStop = createEmptyDraftStop(options?.initial);
  const insertAt =
    typeof options?.insertAfterIndex === 'number'
      ? Math.min(day.items.length, options.insertAfterIndex + 1)
      : day.items.length;

  day.items.splice(insertAt, 0, nextStop);
  return {
    ...itinerary,
    days,
  };
}

export function updateEditableItineraryStop(
  itinerary: EditableItinerary,
  dayNumber: number,
  stopId: string,
  patch: EditableStopPatch,
): EditableItinerary {
  const days = cloneDays(itinerary);
  const day = days.find((candidate) => candidate.day_number === dayNumber);
  if (!day) return itinerary;

  const stopIndex = day.items.findIndex((item) => item.client_id === stopId);
  if (stopIndex === -1) return itinerary;

  day.items[stopIndex] = {
    ...day.items[stopIndex],
    ...patch,
  };

  return {
    ...itinerary,
    days,
  };
}

export function deleteEditableItineraryStop(
  itinerary: EditableItinerary,
  dayNumber: number,
  stopId: string,
): EditableItinerary {
  const days = cloneDays(itinerary);
  const day = days.find((candidate) => candidate.day_number === dayNumber);
  if (!day) return itinerary;

  const nextItems = day.items.filter((item) => item.client_id !== stopId);
  if (nextItems.length === day.items.length) return itinerary;
  day.items = nextItems;

  return {
    ...itinerary,
    days,
  };
}

export function duplicateEditableItineraryStop(
  itinerary: EditableItinerary,
  dayNumber: number,
  stopId: string,
): EditableItinerary {
  const days = cloneDays(itinerary);
  const day = days.find((candidate) => candidate.day_number === dayNumber);
  if (!day) return itinerary;

  const index = day.items.findIndex((item) => item.client_id === stopId);
  if (index === -1) return itinerary;

  const source = day.items[index];
  const duplicate: EditableItineraryItem = {
    ...source,
    client_id: createDraftItemId(),
  };

  day.items.splice(index + 1, 0, duplicate);
  return {
    ...itinerary,
    days,
  };
}

export function reorderEditableItineraryStopWithinDay(
  itinerary: EditableItinerary,
  input: ReorderStopsWithinDayInput,
): EditableItinerary {
  const { dayNumber, sourceIndex, targetIndex } = input;
  const days = cloneDays(itinerary);
  const day = days.find((candidate) => candidate.day_number === dayNumber);
  if (!day) return itinerary;

  if (
    sourceIndex < 0 ||
    sourceIndex >= day.items.length ||
    targetIndex < 0 ||
    targetIndex >= day.items.length
  ) {
    return itinerary;
  }

  day.items = moveIndexWithinArray(day.items, sourceIndex, targetIndex);

  return {
    ...itinerary,
    days,
  };
}

export function duplicateEditableItineraryDay(
  itinerary: EditableItinerary,
  dayNumber: number,
): EditableItinerary {
  const sourceIndex = itinerary.days.findIndex((candidate) => candidate.day_number === dayNumber);
  if (sourceIndex === -1) return itinerary;

  const sourceDay = itinerary.days[sourceIndex];
  const duplicatedDay: EditableDayPlan = {
    ...sourceDay,
    day_number: sourceDay.day_number + 1,
    date: nextIsoDate(sourceDay.date),
    day_anchors: sourceDay.day_anchors.map((anchor) => ({
      ...anchor,
      id: createDayAnchorId(),
    })),
    items: sourceDay.items.map(cloneStopWithNewId),
  };

  const nextDays = [...itinerary.days];
  nextDays.splice(sourceIndex + 1, 0, duplicatedDay);

  return {
    ...itinerary,
    days: normalizeDayNumbers(nextDays),
  };
}

export function clearEditableItineraryDay(
  itinerary: EditableItinerary,
  dayNumber: number,
): EditableItinerary {
  let didClear = false;
  const days = itinerary.days.map((day) => {
    if (day.day_number !== dayNumber) return day;
    if (day.items.length === 0) return day;
    didClear = true;
    return {
      ...day,
      items: [],
    };
  });

  if (!didClear) return itinerary;
  return {
    ...itinerary,
    days,
  };
}

import type {
  DayPlan,
  Itinerary,
  ItineraryItem,
  ItineraryStopStatus,
} from '../../shared/api/ai';

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

export interface EditableDayPlan extends Omit<DayPlan, 'items'> {
  day_title: string | null;
  day_note: string | null;
  items: EditableItineraryItem[];
}

export interface EditableItinerary extends Omit<Itinerary, 'days'> {
  days: EditableDayPlan[];
}

export interface ItemReference {
  day_number: number;
  item_index: number;
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

function cloneStopWithNewId(item: EditableItineraryItem): EditableItineraryItem {
  return {
    ...item,
    client_id: createDraftItemId(),
  };
}

function cloneDays(itinerary: EditableItinerary): EditableDayPlan[] {
  return itinerary.days.map((day) => ({
    ...day,
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
    { day_title: string | null; day_note: string | null }
  >();

  if (previous) {
    for (const day of previous.days) {
      previousDayMetaByNumber.set(day.day_number, {
        day_title: day.day_title,
        day_note: day.day_note,
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
      items: day.items.map((item) => ({
        time: item.time,
        title: item.title,
        location: item.location,
        lat: item.lat,
        lon: item.lon,
        notes: item.notes,
        cost_estimate: item.cost_estimate,
        status: item.status ?? null,
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

export function moveEditableItineraryItem(
  itinerary: EditableItinerary,
  sourceDayNumber: number,
  sourceIndex: number,
  targetDayNumber: number,
  targetIndex: number,
): EditableItinerary {
  const next: EditableItinerary = {
    ...itinerary,
    days: itinerary.days.map((day) => ({ ...day, items: [...day.items] })),
  };

  const sourceDay = next.days.find((day) => day.day_number === sourceDayNumber);
  const targetDay = next.days.find((day) => day.day_number === targetDayNumber);
  if (!sourceDay || !targetDay) return itinerary;

  const [movedItem] = sourceDay.items.splice(sourceIndex, 1);
  if (!movedItem) return itinerary;

  let insertionIndex = targetIndex;
  if (sourceDayNumber === targetDayNumber && sourceIndex < targetIndex) {
    insertionIndex -= 1;
  }

  targetDay.items.splice(Math.max(0, insertionIndex), 0, movedItem);
  return next;
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
        items: [],
      },
    ],
  };
}

export function updateEditableItineraryDay(
  itinerary: EditableItinerary,
  dayNumber: number,
  patch: Partial<Pick<EditableDayPlan, 'day_title' | 'day_note' | 'date'>>,
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
  options?: {
    insertAfterIndex?: number;
    initial?: Partial<Omit<EditableItineraryItem, 'client_id'>>;
  },
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
  patch: Partial<Omit<EditableItineraryItem, 'client_id'>>,
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
  dayNumber: number,
  sourceIndex: number,
  targetIndex: number,
): EditableItinerary {
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

export function moveEditableItineraryStopToDay(
  itinerary: EditableItinerary,
  sourceDayNumber: number,
  stopId: string,
  targetDayNumber: number,
  targetIndex?: number,
): EditableItinerary {
  if (sourceDayNumber === targetDayNumber) return itinerary;

  const days = cloneDays(itinerary);
  const sourceDay = days.find((candidate) => candidate.day_number === sourceDayNumber);
  const targetDay = days.find((candidate) => candidate.day_number === targetDayNumber);
  if (!sourceDay || !targetDay) return itinerary;

  const sourceIndex = sourceDay.items.findIndex((item) => item.client_id === stopId);
  if (sourceIndex === -1) return itinerary;

  const [moved] = sourceDay.items.splice(sourceIndex, 1);
  if (!moved) return itinerary;

  const insertAt =
    typeof targetIndex === 'number'
      ? Math.max(0, Math.min(targetIndex, targetDay.items.length))
      : targetDay.items.length;
  targetDay.items.splice(insertAt, 0, moved);

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

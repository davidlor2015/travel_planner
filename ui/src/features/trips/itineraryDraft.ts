import type { DayPlan, Itinerary, ItineraryItem } from '../../shared/api/ai';

export type RefinementVariant = 'faster_pace' | 'cheaper' | 'more_local' | 'less_walking';
export type RefinementTimeBlock = 'full_day' | 'morning' | 'afternoon' | 'evening';

export interface EditableItineraryItem extends ItineraryItem {
  client_id: string;
}

export interface EditableDayPlan extends Omit<DayPlan, 'items'> {
  items: EditableItineraryItem[];
}

export interface EditableItinerary extends Omit<Itinerary, 'days'> {
  days: EditableDayPlan[];
}

export interface ItemReference {
  day_number: number;
  item_index: number;
}

function itemFingerprint(item: ItineraryItem): string {
  return [item.time, item.title, item.location, item.notes, item.cost_estimate].map((value) => value ?? '').join('|');
}

export function toEditableItinerary(
  itinerary: Itinerary,
  previous?: EditableItinerary,
): EditableItinerary {
  const previousIdByFingerprint = new Map<string, string[]>();

  if (previous) {
    for (const day of previous.days) {
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
      ...day,
      items: day.items.map((item) => ({
        time: item.time,
        title: item.title,
        location: item.location,
        lat: item.lat,
        lon: item.lon,
        notes: item.notes,
        cost_estimate: item.cost_estimate,
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

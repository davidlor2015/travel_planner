// Path: ui-mobile/features/trips/workspace/itineraryDraftMutations.ts
// Summary: Implements itineraryDraftMutations module logic.

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";

export type StopSource = {
  dayIndex: number;
  stopIndex: number;
};

export type StopMoveDirection = "up" | "down";

export type TimeOption = {
  label: string;
  value: string | null;
};

export type DayOption = {
  label: string;
  value: number;
};

export function buildTimeOptions(intervalMinutes: number): TimeOption[] {
  const safeInterval = Number.isFinite(intervalMinutes)
    ? Math.max(1, Math.min(24 * 60, Math.floor(intervalMinutes)))
    : 30;
  const options: TimeOption[] = [{ label: "No time", value: null }];

  for (let minutes = 0; minutes < 24 * 60; minutes += safeInterval) {
    options.push({ label: formatMinutesAsTime(minutes), value: formatMinutesAsTime(minutes) });
  }

  return options;
}

export function buildDayOptions(days: DayPlan[]): DayOption[] {
  return days.map((day, index) => ({
    value: index,
    label: [
      `Day ${day.day_number}`,
      formatDayOptionDate(day.date),
    ].filter(Boolean).join(" · "),
  }));
}

export function addStopToDay(
  itinerary: Itinerary,
  dayIndex: number,
  stop: ItineraryItem,
): Itinerary {
  const day = itinerary.days[dayIndex];
  if (!day) return itinerary;

  return replaceDay(itinerary, dayIndex, {
    ...day,
    items: [...day.items, stop],
  });
}

export function addDayToItinerary(itinerary: Itinerary): Itinerary {
  const previousDay = itinerary.days[itinerary.days.length - 1] ?? null;
  const dayNumber = itinerary.days.length + 1;

  return {
    ...itinerary,
    days: [
      ...itinerary.days,
      {
        day_number: dayNumber,
        date: getNextDayDate(previousDay?.date ?? null),
        day_title: `Day ${dayNumber}`,
        day_note: null,
        anchors: [],
        items: [],
      },
    ],
  };
}

export function deleteDayFromItinerary(
  itinerary: Itinerary,
  dayIndex: number,
): Itinerary {
  if (itinerary.days.length <= 1) return itinerary;
  if (!itinerary.days[dayIndex]) return itinerary;

  return {
    ...itinerary,
    days: itinerary.days
      .filter((_day, index) => index !== dayIndex)
      .map((day, index) => renumberDay(day, index + 1)),
  };
}

export function updateStopInItinerary(
  itinerary: Itinerary,
  source: StopSource,
  updates: Partial<ItineraryItem>,
  targetDayIndex = source.dayIndex,
): Itinerary {
  const sourceDay = itinerary.days[source.dayIndex];
  const stop = sourceDay?.items[source.stopIndex];
  const targetDay = itinerary.days[targetDayIndex];
  if (!sourceDay || !stop || !targetDay) return itinerary;

  const updatedStop = { ...stop, ...updates };
  if (targetDayIndex === source.dayIndex) {
    return replaceDay(itinerary, source.dayIndex, {
      ...sourceDay,
      items: sourceDay.items.map((item, index) =>
        index === source.stopIndex ? updatedStop : item,
      ),
    });
  }

  return moveStopToDay(
    deleteStopFromItinerary(itinerary, source),
    updatedStop,
    targetDayIndex,
  );
}

export function deleteStopFromItinerary(
  itinerary: Itinerary,
  source: StopSource,
): Itinerary {
  const day = itinerary.days[source.dayIndex];
  if (!day?.items[source.stopIndex]) return itinerary;

  return replaceDay(itinerary, source.dayIndex, {
    ...day,
    items: day.items.filter((_item, index) => index !== source.stopIndex),
  });
}

export function moveStopWithinDay(
  itinerary: Itinerary,
  source: StopSource,
  direction: StopMoveDirection,
): Itinerary {
  const day = itinerary.days[source.dayIndex];
  const stop = day?.items[source.stopIndex];
  if (!day || !stop) return itinerary;

  const targetIndex = direction === "up" ? source.stopIndex - 1 : source.stopIndex + 1;
  if (targetIndex < 0 || targetIndex >= day.items.length) return itinerary;

  const nextItems = [...day.items];
  nextItems[source.stopIndex] = nextItems[targetIndex]!;
  nextItems[targetIndex] = stop;

  return replaceDay(itinerary, source.dayIndex, { ...day, items: nextItems });
}

export function moveStopToDay(
  itinerary: Itinerary,
  stopOrSource: ItineraryItem | StopSource,
  targetDayIndex: number,
): Itinerary {
  const targetDay = itinerary.days[targetDayIndex];
  if (!targetDay) return itinerary;

  if (isStopSource(stopOrSource)) {
    const sourceDay = itinerary.days[stopOrSource.dayIndex];
    const stop = sourceDay?.items[stopOrSource.stopIndex];
    if (!sourceDay || !stop) return itinerary;
    if (targetDayIndex === stopOrSource.dayIndex) return itinerary;

    const withoutStop = deleteStopFromItinerary(itinerary, stopOrSource);
    const nextTargetDay = withoutStop.days[targetDayIndex];
    if (!nextTargetDay) return itinerary;
    return replaceDay(withoutStop, targetDayIndex, {
      ...nextTargetDay,
      items: [...nextTargetDay.items, stop],
    });
  }

  return replaceDay(itinerary, targetDayIndex, {
    ...targetDay,
    items: [...targetDay.items, stopOrSource],
  });
}

export function getStopMoveAvailability(
  itinerary: Itinerary | null,
  source: StopSource | null,
) {
  if (!itinerary || !source) {
    return { canMoveUp: false, canMoveDown: false, canMoveToPreviousDay: false, canMoveToNextDay: false };
  }

  const day = itinerary.days[source.dayIndex];
  const stopExists = Boolean(day?.items[source.stopIndex]);
  if (!day || !stopExists) {
    return { canMoveUp: false, canMoveDown: false, canMoveToPreviousDay: false, canMoveToNextDay: false };
  }

  return {
    canMoveUp: source.stopIndex > 0,
    canMoveDown: source.stopIndex < day.items.length - 1,
    canMoveToPreviousDay: source.dayIndex > 0,
    canMoveToNextDay: source.dayIndex < itinerary.days.length - 1,
  };
}

function replaceDay(itinerary: Itinerary, dayIndex: number, nextDay: DayPlan): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day, index) => (index === dayIndex ? nextDay : day)),
  };
}

function renumberDay(day: DayPlan, dayNumber: number): DayPlan {
  return {
    ...day,
    day_number: dayNumber,
    day_title: normalizeRenumberedDayTitle(day.day_title, dayNumber),
  };
}

function normalizeRenumberedDayTitle(title: string | null | undefined, dayNumber: number): string | null | undefined {
  const trimmed = title?.trim();
  if (!trimmed || /^Day \d+$/i.test(trimmed)) return `Day ${dayNumber}`;
  return title;
}

function getNextDayDate(dateStr: string | null): string | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setDate(parsed.getDate() + 1);
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function isStopSource(value: ItineraryItem | StopSource): value is StopSource {
  return "dayIndex" in value && "stopIndex" in value;
}

function formatMinutesAsTime(totalMinutes: number): string {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatDayOptionDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const monthDay = parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const weekday = parsed.toLocaleDateString(undefined, { weekday: "short" });
  return `${monthDay} · ${weekday}`;
}

// Path: ui/src/features/trips/itinerary/itineraryEditorModels.ts
// Summary: Implements itineraryEditorModels module logic.

import type { EditableDayPlan, EditableItineraryItem } from "./itineraryDraft";
import { normalizeStopStatus } from "./itineraryDraft";
import { extractStopOwnershipMetadata } from "./itineraryDraft";
import { inferStopCategory, type StopCategory } from "./components/stopCategory";
import type { ItineraryStopStatus } from "../../../shared/api/ai";

const NOTE_PREVIEW_MAX = 140;

/** Collapsed row + chrome: derived only from stop data + selection flags. */
const STOP_STATUS_LABEL: Record<ItineraryStopStatus, string> = {
  planned: "Planned",
  confirmed: "Confirmed",
  skipped: "Skipped",
};

export interface StopRowViewModel {
  displayTitle: string;
  showUntitled: boolean;
  timeBadge: { kind: "fixed"; label: string } | { kind: "flexible" };
  secondaryLine: string | null;
  category: StopCategory;
  stopStatus: ItineraryStopStatus;
  stopStatusLabel: string;
  costDisplay: string | null;
  handledBy: string | null;
  bookedBy: string | null;
  showLocked: boolean;
  showFavorite: boolean;
}

export function buildStopRowViewModel(
  item: EditableItineraryItem,
  flags: { isLocked: boolean; isFavorite: boolean },
): StopRowViewModel {
  const title = item.title?.trim() ?? "";
  const { metadata, plainNotes } = extractStopOwnershipMetadata(item.notes, {
    handledBy: item.handled_by ?? null,
    bookedBy: item.booked_by ?? null,
  });
  const secondaryLine = [item.location, plainNotes]
    .filter(Boolean)
    .join(" · ");
  const stopStatus = normalizeStopStatus(item.status);

  return {
    displayTitle: title,
    showUntitled: !title,
    timeBadge: item.time?.trim()
      ? { kind: "fixed", label: item.time.trim() }
      : { kind: "flexible" },
    secondaryLine: secondaryLine || null,
    category: inferStopCategory(
      item.title,
      item.location,
      item.notes,
    ),
    stopStatus,
    stopStatusLabel: STOP_STATUS_LABEL[stopStatus],
    costDisplay: item.cost_estimate?.trim() || null,
    handledBy: metadata.handledBy,
    bookedBy: metadata.bookedBy,
    showLocked: flags.isLocked,
    showFavorite: flags.isFavorite,
  };
}

/** Map stored time strings to `input type="time"` value, or empty when not parseable as HH:MM. */
export function htmlTimeFromStoredTime(time: string | null): string {
  if (!time?.trim()) return "";
  const t = time.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  let h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return "";
  h = Math.min(23, Math.max(0, h));
  const mm = Math.min(59, Math.max(0, min));
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** When false, use a plain text field so we never coerce freeform times into fake HH:MM. */
export function shouldUseHtmlTimeInput(time: string | null): boolean {
  if (time == null || !String(time).trim()) return true;
  return htmlTimeFromStoredTime(time) !== "";
}

export function formatDayDateLabel(date: string | null): string {
  if (!date) return "Date flexible";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function summarizeTimeWindowLabel(
  items: EditableItineraryItem[],
): string {
  const times = items
    .map((item) => item.time?.trim())
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b));
  if (!times.length) return "No timed stops";
  const start = times[0];
  const end = times[times.length - 1];
  if (start === end) return `Starts around ${start}`;
  return `${start} to ${end}`;
}

export function dayNotePreview(note: string | null): string | null {
  const value = note?.trim();
  if (!value) return null;
  if (value.length <= NOTE_PREVIEW_MAX) return value;
  return `${value.slice(0, NOTE_PREVIEW_MAX)}...`;
}

function countItemsWithCostEstimate(day: EditableDayPlan): number {
  return day.items.filter((item) => item.cost_estimate?.trim()).length;
}

const USD_FORMATTER = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const DAY_ANCHOR_TYPE_LABEL: Record<EditableDayPlan["day_anchors"][number]["type"], string> = {
  flight: "Flight",
  hotel_checkin: "Hotel check-in",
};

export interface DayTimeConflict {
  previousIndex: number;
  currentIndex: number;
  kind: "overlap" | "out_of_order";
}

export interface DayTimeConflictSummary {
  conflicts: DayTimeConflict[];
  rowHints: Map<number, string>;
}

function parseComparableTimeToMinutes(raw: string | null | undefined): number | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;

  const hhmmMatch = value.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
  if (hhmmMatch) {
    let hour = Number(hhmmMatch[1]);
    const minute = Number(hhmmMatch[2]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (minute < 0 || minute > 59) return null;
    const meridiem = hhmmMatch[3]?.toLowerCase() ?? null;
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      if (hour === 12) hour = 0;
      if (meridiem === "pm") hour += 12;
    } else if (hour < 0 || hour > 23) {
      return null;
    }
    return hour * 60 + minute;
  }

  const hourOnlyMatch = value.match(/^(\d{1,2})\s*([ap]m)$/i);
  if (hourOnlyMatch) {
    let hour = Number(hourOnlyMatch[1]);
    const meridiem = hourOnlyMatch[2]?.toLowerCase();
    if (Number.isNaN(hour) || !meridiem) return null;
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "pm") hour += 12;
    return hour * 60;
  }

  return null;
}

function summarizeDayAnchor(anchor: EditableDayPlan["day_anchors"][number]): string {
  const typeLabel = DAY_ANCHOR_TYPE_LABEL[anchor.type];
  const label = anchor.label.trim();
  const base = label || typeLabel;
  const time = anchor.time?.trim();
  if (!time) return base;
  return `${base} ${time}`;
}

function parseConservativeCostAmount(raw: string | null | undefined): number | null {
  const value = raw?.trim();
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ");
  const strictCurrency = normalized.match(
    /^(?:[$€£]\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?:\s*(?:usd|dollars?))?$/i,
  );
  const strictPlain = normalized.match(/^\d+(?:\.\d{1,2})?\s*(?:usd|dollars?)$/i);
  if (!strictCurrency && !strictPlain) return null;
  const numeric = normalized.replace(/[$€£,\s]|usd|dollars?/gi, "");
  if (!numeric) return null;
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export interface DayCostSummary {
  total: number | null;
  display: string | null;
  parsedItemCount: number;
  estimatedItemCount: number;
}

export interface TripCostSummary {
  total: number | null;
  display: string | null;
  parsedItemCount: number;
  estimatedItemCount: number;
}

export function buildDayCostSummary(day: EditableDayPlan): DayCostSummary {
  let total = 0;
  let parsedItemCount = 0;
  const estimatedItemCount = day.items.filter((item) => Boolean(item.cost_estimate?.trim())).length;
  for (const item of day.items) {
    const parsed = parseConservativeCostAmount(item.cost_estimate);
    if (parsed == null) continue;
    total += parsed;
    parsedItemCount += 1;
  }
  return {
    total: parsedItemCount > 0 ? total : null,
    display: parsedItemCount > 0 ? USD_FORMATTER.format(total) : null,
    parsedItemCount,
    estimatedItemCount,
  };
}

export function buildTripCostSummary(days: EditableDayPlan[]): TripCostSummary {
  let total = 0;
  let parsedItemCount = 0;
  let estimatedItemCount = 0;
  for (const day of days) {
    const daySummary = buildDayCostSummary(day);
    if (daySummary.total != null) {
      total += daySummary.total;
      parsedItemCount += daySummary.parsedItemCount;
    }
    estimatedItemCount += daySummary.estimatedItemCount;
  }
  return {
    total: parsedItemCount > 0 ? total : null,
    display: parsedItemCount > 0 ? USD_FORMATTER.format(total) : null,
    parsedItemCount,
    estimatedItemCount,
  };
}

export function deriveDayTimeConflictSummary(
  items: EditableItineraryItem[],
): DayTimeConflictSummary {
  const rowHints = new Map<number, string>();
  const conflicts: DayTimeConflict[] = [];
  let previousTimedIndex: number | null = null;
  let previousMinutes: number | null = null;

  items.forEach((item, index) => {
    const currentMinutes = parseComparableTimeToMinutes(item.time);
    if (currentMinutes == null) return;
    if (previousTimedIndex != null && previousMinutes != null) {
      if (currentMinutes < previousMinutes) {
        conflicts.push({
          previousIndex: previousTimedIndex,
          currentIndex: index,
          kind: "out_of_order",
        });
        rowHints.set(index, "Time is earlier than the stop above.");
      } else if (currentMinutes === previousMinutes) {
        conflicts.push({
          previousIndex: previousTimedIndex,
          currentIndex: index,
          kind: "overlap",
        });
        rowHints.set(index, "Same time as the stop above.");
      }
    }
    previousTimedIndex = index;
    previousMinutes = currentMinutes;
  });

  return { conflicts, rowHints };
}

export interface DayPanelMeta {
  dayLabel: string;
  formattedDate: string;
  metaLine: string;
  costCount: number;
  timeWindowLabel: string;
  locationCount: number;
  dayPreview: string | null;
  dayCostDisplay: string | null;
  dayCostCoverageLabel: string | null;
  dayCostSummary: DayCostSummary;
  anchorSummary: string | null;
  anchorCount: number;
  timeConflictHint: string | null;
  timeConflictCount: number;
  rowTimeHints: Map<number, string>;
}

export function buildDayPanelMeta(day: EditableDayPlan): DayPanelMeta {
  const stopCount = day.items.length;
  const costCount = countItemsWithCostEstimate(day);
  const timeWindowLabel = summarizeTimeWindowLabel(day.items);
  const dayCostSummary = buildDayCostSummary(day);
  const timeConflictSummary = deriveDayTimeConflictSummary(day.items);
  const anchors = day.day_anchors ?? [];
  const anchorCount = anchors.length;
  const anchorSummary =
    anchorCount > 0
      ? anchors
          .slice(0, 2)
          .map((anchor) => summarizeDayAnchor(anchor))
          .join(" · ")
      : null;
  const locationCount = new Set(
    day.items
      .map((item) => item.location?.trim())
      .filter((value): value is string => Boolean(value)),
  ).size;

  const dayLabel = day.day_title?.trim() || `Day ${day.day_number}`;
  const dayPreview = dayNotePreview(day.day_note);

  const metaParts = [
    `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`,
    timeWindowLabel,
  ];
  if (locationCount > 0) {
    metaParts.push(
      `${locationCount} ${locationCount === 1 ? "place" : "places"}`,
    );
  }
  if (costCount > 0) {
    metaParts.push(`${costCount} with cost${costCount === 1 ? "" : "s"}`);
  }
  if (anchorCount > 0) {
    metaParts.push(`${anchorCount} ${anchorCount === 1 ? "anchor" : "anchors"}`);
  }

  return {
    dayLabel,
    formattedDate: formatDayDateLabel(day.date),
    metaLine: metaParts.join(" · "),
    costCount,
    timeWindowLabel,
    locationCount,
    dayPreview,
    dayCostDisplay: dayCostSummary.display,
    dayCostCoverageLabel:
      dayCostSummary.estimatedItemCount > 0
        ? `${dayCostSummary.parsedItemCount}/${dayCostSummary.estimatedItemCount} parsed`
        : null,
    dayCostSummary,
    anchorSummary,
    anchorCount,
    timeConflictHint:
      timeConflictSummary.conflicts.length > 0
        ? `${timeConflictSummary.conflicts.length} advisory time conflict${
            timeConflictSummary.conflicts.length === 1 ? "" : "s"
          }`
        : null,
    timeConflictCount: timeConflictSummary.conflicts.length,
    rowTimeHints: timeConflictSummary.rowHints,
  };
}

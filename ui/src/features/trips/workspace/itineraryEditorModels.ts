import type { EditableDayPlan, EditableItineraryItem } from "../itineraryDraft";
import { normalizeStopStatus } from "../itineraryDraft";
import { inferStopCategory, type StopCategory } from "../EditableItineraryPanel/stopCategory";
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
  showLocked: boolean;
  showFavorite: boolean;
}

export function buildStopRowViewModel(
  item: EditableItineraryItem,
  flags: { isLocked: boolean; isFavorite: boolean },
): StopRowViewModel {
  const title = item.title?.trim() ?? "";
  const secondaryLine = [item.location, item.notes]
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

export interface DayPanelMeta {
  dayLabel: string;
  formattedDate: string;
  metaLine: string;
  costCount: number;
  timeWindowLabel: string;
  locationCount: number;
  dayPreview: string | null;
}

export function buildDayPanelMeta(day: EditableDayPlan): DayPanelMeta {
  const stopCount = day.items.length;
  const costCount = countItemsWithCostEstimate(day);
  const timeWindowLabel = summarizeTimeWindowLabel(day.items);
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

  return {
    dayLabel,
    formattedDate: formatDayDateLabel(day.date),
    metaLine: metaParts.join(" · "),
    costCount,
    timeWindowLabel,
    locationCount,
    dayPreview,
  };
}

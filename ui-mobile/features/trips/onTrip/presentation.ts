import type { TripExecutionStatus, TripOnTripBlocker, TripOnTripSnapshot } from "../types";
import type { StopVM, TimelineVariant } from "./adapters";

export type OnTripDayHeaderVM = {
  eyebrow: string;
  title: string;
  meta: string;
};

export type OnTripBlockerStripVM = {
  title: string;
  detail: string | null;
  actionLabel: string | null;
};

export type OnTripStatusTone = "confirmed" | "planned" | "skipped";

export function buildOnTripDayHeader(
  snapshot: TripOnTripSnapshot,
  tripTitle: string,
): OnTripDayHeaderVM {
  const dayNumber = snapshot.today.day_number;
  const eyebrow =
    typeof dayNumber === "number" && dayNumber > 0
      ? `ON TRIP · DAY ${dayNumber}`
      : "ON TRIP";
  const weekday = formatWeekday(snapshot.today.day_date);
  const place = findTodayPlace(snapshot) ?? tripTitle.trim();
  const title = weekday && place ? `${weekday} in ${place}` : weekday ?? tripTitle;
  const meta = [formatShortDate(snapshot.today.day_date), formatStopCount(snapshot.today_stops.length)]
    .filter(Boolean)
    .join(" · ");

  return { eyebrow, title, meta };
}

export function buildBlockerStrip(blockers: TripOnTripBlocker[]): OnTripBlockerStripVM | null {
  const first = blockers[0];
  if (!first) return null;

  return {
    title: first.title,
    detail: first.detail?.trim() || null,
    actionLabel: blockers.length > 1 ? `${blockers.length} items` : null,
  };
}

export function buildNavigateUrl(stop: StopVM): string | null {
  const location = stop.location?.trim();
  if (!location) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(location)}`;
}

export function getStatusLabel(status: TripExecutionStatus): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "skipped") return "Skipped";
  return "Planned";
}

export function getStatusTone(status: TripExecutionStatus): OnTripStatusTone {
  if (status === "confirmed") return "confirmed";
  if (status === "skipped") return "skipped";
  return "planned";
}

export function isStopNow(variant: TimelineVariant): boolean {
  return variant === "now";
}

export function shouldMuteStop(stop: StopVM): boolean {
  return stop.effectiveStatus === "skipped";
}

function findTodayPlace(snapshot: TripOnTripSnapshot): string | null {
  const candidates = [
    snapshot.today.location,
    snapshot.today_stops.find((stop) => stop.location?.trim())?.location,
    snapshot.next_stop.location,
  ];
  return candidates.map((value) => value?.trim()).find(Boolean) ?? null;
}

function formatWeekday(iso: string | null): string | null {
  if (!iso) return "Today";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStopCount(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

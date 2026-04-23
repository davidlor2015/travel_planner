import type { TripStatus } from "../types";

export function getTripStatus(startIso: string, endIso: string): TripStatus {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "active";
}

export function getTripTimelineLabel(startIso: string, endIso: string): string {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const daysUntilStart = Math.ceil((start - now) / 86_400_000);
  const daysUntilEnd = Math.ceil((end - now) / 86_400_000);

  if (daysUntilStart > 1) return `${daysUntilStart} days until departure`;
  if (daysUntilStart === 1) return "Departs tomorrow";
  if (daysUntilStart === 0) return "Departs today";
  if (daysUntilEnd >= 0) return "Currently traveling";
  if (daysUntilEnd === -1) return "Ended yesterday";
  return `Completed ${Math.abs(daysUntilEnd)} days ago`;
}

export function formatTripDateRange(
  startIso: string,
  endIso: string,
  compact = false,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (compact) {
    return (
      start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " - " +
      end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return (
      start.toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
      " - " +
      end.getDate() +
      ", " +
      end.getFullYear()
    );
  }

  return (
    start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " - " +
    end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
}

export function getTripDurationDays(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

import type { TripListItem, TripResponse } from "./types";

export type TripListItemViewModel = TripListItem & {
  statusLabel: string;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTripStatus(
  startDate: string,
  endDate: string,
): TripListItem["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "active";
}

function statusLabel(status: TripListItem["status"]): string {
  if (status === "active") return "In Progress";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

export function toTripListItem(trip: TripResponse): TripListItemViewModel {
  const status = getTripStatus(trip.start_date, trip.end_date);
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dateRange: `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`,
    memberCount: trip.member_count,
    status,
    statusLabel: statusLabel(status),
  };
}

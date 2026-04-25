import { toTripListItem, type TripListItemViewModel } from "../adapters";
import type { TripResponse, TripSummary } from "../types";

export type ArchiveTripViewModel = TripListItemViewModel & {
  year: number;
  duration: string;
  rawEndDate: string;
};

export type ArchiveYearGroup = {
  year: number;
  data: ArchiveTripViewModel[];
};

function computeDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return "Day trip";
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

export function toArchiveTripViewModel(
  trip: TripResponse,
  summary?: TripSummary,
): ArchiveTripViewModel {
  const base = toTripListItem(trip, summary);
  const year = new Date(trip.end_date).getFullYear();
  const duration = computeDuration(trip.start_date, trip.end_date);
  return { ...base, year, duration, rawEndDate: trip.end_date };
}

export function groupTripsByYear(trips: ArchiveTripViewModel[]): ArchiveYearGroup[] {
  const byYear = new Map<number, ArchiveTripViewModel[]>();
  for (const trip of trips) {
    const list = byYear.get(trip.year) ?? [];
    list.push(trip);
    byYear.set(trip.year, list);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, trips]) => ({
      year,
      data: trips.sort((a, b) => b.rawEndDate.localeCompare(a.rawEndDate)),
    }));
}

export function filterArchiveTrips(
  trips: ArchiveTripViewModel[],
  query: string,
): ArchiveTripViewModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return trips;
  return trips.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q),
  );
}

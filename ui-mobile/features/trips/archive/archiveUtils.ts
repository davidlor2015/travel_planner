// Path: ui-mobile/features/trips/archive/archiveUtils.ts
// Summary: Implements archiveUtils module logic.

import { toTripListItem, type TripListItemViewModel } from "../adapters";
import type { TripExecutionSummary, TripResponse, TripSummary } from "../types";

export type ArchiveExecutionSummaryViewModel = {
  confirmedStopsCount: number;
  skippedStopsCount: number;
  unplannedStopsCount: number;
};

export type ArchiveTripViewModel = TripListItemViewModel & {
  year: number;
  duration: string;
  rawEndDate: string;
  hasSavedItinerary: boolean;
  reservationCount: number;
  totalSpent: number | null;
  executionSummary: ArchiveExecutionSummaryViewModel | null;
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

function looksLikeSavedItinerary(description: string | null): boolean {
  if (!description) return false;
  const trimmed = description.trim();
  return trimmed.includes('"days"') && trimmed.includes('"summary"');
}

export function toArchiveTripViewModel(
  trip: TripResponse,
  summary?: TripSummary,
  executionSummary?: TripExecutionSummary | null,
): ArchiveTripViewModel {
  const base = toTripListItem(trip, summary);
  const year = new Date(trip.end_date).getFullYear();
  const duration = computeDuration(trip.start_date, trip.end_date);
  return {
    ...base,
    year,
    duration,
    rawEndDate: trip.end_date,
    hasSavedItinerary: looksLikeSavedItinerary(trip.description),
    reservationCount: summary?.reservation_count ?? 0,
    totalSpent: summary && summary.budget_expense_count > 0 ? summary.budget_total_spent : null,
    executionSummary: executionSummary
      ? {
          confirmedStopsCount: executionSummary.confirmed_stops_count,
          skippedStopsCount: executionSummary.skipped_stops_count,
          unplannedStopsCount: executionSummary.unplanned_stops_count,
        }
      : null,
  };
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

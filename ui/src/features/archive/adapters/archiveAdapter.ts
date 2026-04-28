// Path: ui/src/features/archive/adapters/archiveAdapter.ts
// Summary: Implements archiveAdapter module logic.

import type { Trip, TripExecutionSummary } from "../../../shared/api/trips";
import { parseTripItineraryPayload } from "../../trips/workspace/models/normalizeTripWorkspace";
import { getTripImageUrl } from "../../trips/workspace/helpers/tripVisuals";
import type {
  ArchiveSummaryLine,
  ArchiveTripItem,
  ArchiveYearGroup,
} from "../types";

function getTripDurationDays(startDate: Date, endDate: Date): number {
  return Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
  );
}

function splitDestination(destination: string): {
  primary: string;
  secondary: string;
} {
  const [primary, ...rest] = destination
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    primary: primary || destination,
    secondary: rest.join(", "),
  };
}

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")
  ).toUpperCase();
}

function looksLikeSavedItinerary(description: string | null): boolean {
  if (!description) return false;
  const trimmed = description.trim();
  if (!trimmed) return false;
  if (trimmed.includes('"days"') && trimmed.includes('"summary"')) return true;
  return trimmed.includes("DETAILS (JSON):") && trimmed.includes('"days"');
}

function isPastTrip(trip: Trip): boolean {
  return new Date(trip.end_date).getTime() < Date.now();
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractNotesPreview(notes: string | null): string | null {
  if (!notes) return null;
  const compact = compactText(notes);
  if (!compact) return null;
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117).trimEnd()}...`;
}

export function toArchiveTrip(trip: Trip): ArchiveTripItem {
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const destination = splitDestination(trip.destination);
  const itinerary = parseTripItineraryPayload(trip.description);
  const itineraryDayCount = itinerary?.days.length ?? null;
  const itineraryStopCount = itinerary
    ? itinerary.days.reduce((total, day) => total + day.items.length, 0)
    : null;

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    destinationPrimary: destination.primary,
    destinationSecondary: destination.secondary,
    startDate,
    endDate,
    year: endDate.getFullYear(),
    durationDays: getTripDurationDays(startDate, endDate),
    memberCount: trip.member_count,
    memberInitials: trip.members.slice(0, 3).map((member) => getInitials(member.email)),
    imageUrl: getTripImageUrl(trip),
    hasSavedItinerary: looksLikeSavedItinerary(trip.description),
    itineraryDayCount,
    itineraryStopCount,
    notesPreview: extractNotesPreview(trip.notes),
    executionSummary: null,
  };
}

function toArchiveExecutionSummary(
  executionSummary: TripExecutionSummary | null | undefined,
) {
  if (!executionSummary) return null;
  return {
    confirmedStopsCount: executionSummary.confirmed_stops_count,
    skippedStopsCount: executionSummary.skipped_stops_count,
    unplannedStopsCount: executionSummary.unplanned_stops_count,
  };
}

export function getArchiveTrips(
  trips: Trip[],
  executionSummaryByTripId: Record<number, TripExecutionSummary | null> = {},
): ArchiveTripItem[] {
  return trips
    .filter(isPastTrip)
    .map((trip) => ({
      ...toArchiveTrip(trip),
      executionSummary: toArchiveExecutionSummary(executionSummaryByTripId[trip.id]),
    }))
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
}

export function filterArchiveTrips(
  trips: ArchiveTripItem[],
  query: string,
): ArchiveTripItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return trips;

  return trips.filter((trip) =>
    `${trip.title} ${trip.destination} ${trip.year}`
      .toLowerCase()
      .includes(normalized),
  );
}

export function groupArchiveTripsByYear(
  trips: ArchiveTripItem[],
): ArchiveYearGroup[] {
  const groups = new Map<number, ArchiveTripItem[]>();
  for (const trip of trips) {
    const current = groups.get(trip.year) ?? [];
    current.push(trip);
    groups.set(trip.year, current);
  }

  return Array.from(groups.entries())
    .map(([year, rows]) => ({
      year,
      trips: rows.sort((a, b) => b.endDate.getTime() - a.endDate.getTime()),
    }))
    .sort((a, b) => b.year - a.year);
}

function countryCount(trips: ArchiveTripItem[]): number {
  const countries = new Set<string>();
  for (const trip of trips) {
    const parts = trip.destination
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    countries.add(parts.at(-1) ?? trip.destinationPrimary);
  }
  return countries.size;
}

export function buildArchiveSummaryLine(
  trips: ArchiveTripItem[],
): ArchiveSummaryLine {
  const totalDays = trips.reduce((sum, trip) => sum + trip.durationDays, 0);
  const totalTravelers = trips.reduce((sum, trip) => sum + trip.memberCount, 0);

  return {
    totalTrips: trips.length,
    totalCountries: countryCount(trips),
    totalDays,
    totalTravelers,
  };
}

export function formatArchiveMetadata(summary: ArchiveSummaryLine): string {
  return [
    `${summary.totalTrips} trip${summary.totalTrips === 1 ? "" : "s"}`,
    `${summary.totalCountries} countr${summary.totalCountries === 1 ? "y" : "ies"}`,
    `${summary.totalDays} day${summary.totalDays === 1 ? "" : "s"}`,
    `${summary.totalTravelers} traveler${summary.totalTravelers === 1 ? "" : "s"}`,
  ].join(" - ");
}

export function formatArchiveDateRange(startDate: Date, endDate: Date): string {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })}`;
  }

  if (sameYear) {
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

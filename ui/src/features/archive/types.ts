// Path: ui/src/features/archive/types.ts
// Summary: Implements types module logic.

export type ArchiveViewMode = "grid" | "list";

export interface ArchiveTripItem {
  id: number;
  title: string;
  destination: string;
  destinationPrimary: string;
  destinationSecondary: string;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  year: number;
  durationDays: number;
  memberCount: number;
  memberInitials: string[];
  hasSavedItinerary: boolean;
}

export interface ArchiveYearGroup {
  year: number;
  trips: ArchiveTripItem[];
}

export interface ArchiveSummaryLine {
  totalTrips: number;
  totalCountries: number;
  totalDays: number;
  totalTravelers: number;
}

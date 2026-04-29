// Path: ui/src/features/archive/components/ArchiveYearGroupList.tsx
// Summary: Renders the ArchiveYearGroupList UI component.

import type {
  ArchiveViewMode,
  ArchiveYearGroup,
} from "../types";
import { ArchiveTripCard } from "./ArchiveTripCard";
import { ArchiveTripRow } from "./ArchiveTripRow";

interface ArchiveYearGroupListProps {
  groups: ArchiveYearGroup[];
  view: ArchiveViewMode;
  ratings: Record<number, number>;
  onViewTrip: (tripId: number) => void;
  onReuseTrip: (destination: string) => void;
  onCopyTripLink: (tripId: number) => Promise<boolean>;
  onRateTrip: (tripId: number, rating: number) => void;
}

export function ArchiveYearGroupList({
  groups,
  view,
  ratings,
  onViewTrip,
  onReuseTrip,
  onCopyTripLink,
  onRateTrip,
}: ArchiveYearGroupListProps) {
  return (
    <div className="space-y-10 pb-8">
      {groups.map((group) => (
        <section
          key={group.year}
          aria-labelledby={`archive-year-${group.year}`}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-espresso text-[12px] font-semibold text-amber">
              {String(group.year).slice(-2)}
            </span>
            <h2
              id={`archive-year-${group.year}`}
              className="text-2xl font-semibold text-espresso"
            >
              {group.year}
            </h2>
            <div className="h-px flex-1 bg-smoke" />
            <span className="text-sm font-medium text-muted">
              {group.trips.length} trip{group.trips.length === 1 ? "" : "s"}
            </span>
          </div>

          {view === "grid" ? (
            <div className="grid gap-5 md:grid-cols-2">
              {group.trips.map((trip) => (
                <ArchiveTripCard
                  key={trip.id}
                  trip={trip}
                  onViewTrip={onViewTrip}
                  onReuseTrip={onReuseTrip}
                  onCopyTripLink={onCopyTripLink}
                  rating={ratings[trip.id]}
                  onRateTrip={onRateTrip}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {group.trips.map((trip) => (
                <ArchiveTripRow
                  key={trip.id}
                  trip={trip}
                  onViewTrip={onViewTrip}
                  onReuseTrip={onReuseTrip}
                  onCopyTripLink={onCopyTripLink}
                  rating={ratings[trip.id]}
                  onRateTrip={onRateTrip}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

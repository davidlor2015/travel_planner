// Path: ui/src/features/archive/components/ArchiveTripRow.tsx
// Summary: Renders the ArchiveTripRow UI component.

import { AvatarStack, StatusPill } from "../../../shared/ui";
import { formatArchiveDateRange } from "../adapters/archiveAdapter";
import type { ArchiveTripItem } from "../types";

interface ArchiveTripRowProps {
  trip: ArchiveTripItem;
  onViewTrip: (tripId: number) => void;
  onReuseTrip: (destination: string) => void;
  onCopyTripLink: (tripId: number) => Promise<boolean>;
  rating: number | undefined;
  onRateTrip: (tripId: number, rating: number) => void;
}

export function ArchiveTripRow({
  trip,
  onViewTrip,
  onReuseTrip,
  onCopyTripLink,
  rating,
  onRateTrip,
}: ArchiveTripRowProps) {
  const stackItems = trip.memberInitials.map((initial, index) => ({
    id: `${trip.id}-${index}`,
    label: initial,
  }));

  return (
    <article className="grid gap-4 rounded-2xl border border-smoke bg-white px-4 py-4 shadow-[0_6px_18px_rgba(28,17,8,0.04)] sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center">
      <img
        src={trip.imageUrl}
        alt=""
        className="h-28 w-full rounded-xl object-cover sm:h-20 sm:w-28"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-espresso">{trip.title}</h3>
          {trip.hasSavedItinerary ? (
            <StatusPill tone="positive">Saved itinerary</StatusPill>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-flint">
          {trip.destinationPrimary}
          {trip.destinationSecondary
            ? `, ${trip.destinationSecondary}`
            : ""} - {formatArchiveDateRange(trip.startDate, trip.endDate)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>
            {trip.durationDays} day{trip.durationDays === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2">
            <AvatarStack items={stackItems} />
            {trip.memberCount} traveler{trip.memberCount === 1 ? "" : "s"}
          </span>
          {rating ? <span>{rating}/5 rated</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onViewTrip(trip.id)}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white"
        >
          View Trip
        </button>
        <button
          type="button"
          onClick={() => onReuseTrip(trip.destination)}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-smoke bg-parchment px-3.5 py-2 text-sm font-semibold text-flint"
        >
          Plan Again
        </button>
        <button
          type="button"
          onClick={() => void onCopyTripLink(trip.id)}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-smoke bg-white px-3.5 py-2 text-sm font-semibold text-flint"
        >
          Copy Link
        </button>
        {!rating ? (
          <button
            type="button"
            onClick={() => onRateTrip(trip.id, 5)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-smoke bg-white px-3.5 py-2 text-sm font-semibold text-amber"
          >
            Rate 5/5
          </button>
        ) : null}
      </div>
    </article>
  );
}

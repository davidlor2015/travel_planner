import { AvatarStack, StatusPill } from "../../../shared/ui";
import { formatArchiveDateRange } from "../adapters/archiveAdapter";
import type { ArchiveTripItem } from "../../shared/types/archive.types";

interface ArchiveTripCardProps {
  trip: ArchiveTripItem;
  onViewTrip: (tripId: number) => void;
  onReuseTrip: (destination: string) => void;
  onCopyTripLink: (tripId: number) => Promise<boolean>;
  rating: number | undefined;
  onRateTrip: (tripId: number, rating: number) => void;
}

export function ArchiveTripCard({
  trip,
  onViewTrip,
  onReuseTrip,
  onCopyTripLink,
  rating,
  onRateTrip,
}: ArchiveTripCardProps) {
  const stackItems = trip.memberInitials.map((initial, index) => ({
    id: `${trip.id}-${index}`,
    label: initial,
  }));

  return (
    <article className="overflow-hidden rounded-2xl border border-smoke bg-white shadow-[0_14px_36px_rgba(28,17,8,0.06)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-smoke">
        <img
          src={trip.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xl font-semibold leading-tight">{trip.title}</p>
          <p className="mt-1 text-sm text-white/82">{trip.destination}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-flint">
          <span>{formatArchiveDateRange(trip.startDate, trip.endDate)}</span>
          <span aria-hidden="true">-</span>
          <span>
            {trip.durationDays} day{trip.durationDays === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-flint">
            <AvatarStack items={stackItems} />
            <span>
              {trip.memberCount} traveler{trip.memberCount === 1 ? "" : "s"}
            </span>
          </div>
          {trip.hasSavedItinerary ? (
            <StatusPill tone="positive">Saved itinerary</StatusPill>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewTrip(trip.id)}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-espresso-dark"
          >
            View Trip
          </button>
          <button
            type="button"
            onClick={() => onReuseTrip(trip.destination)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-smoke bg-parchment px-3.5 py-2 text-sm font-semibold text-flint transition-colors hover:border-amber/30 hover:bg-[#F5EDE7] hover:text-espresso"
          >
            Plan Again
          </button>
          <button
            type="button"
            onClick={() => void onCopyTripLink(trip.id)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-smoke bg-white px-3.5 py-2 text-sm font-semibold text-flint transition-colors hover:border-amber/30 hover:bg-parchment hover:text-espresso"
          >
            Copy Link
          </button>
        </div>

        <div className="rounded-xl border border-smoke bg-parchment/35 px-3 py-2">
          {rating ? (
            <p className="text-xs text-olive">
              You rated this trip {rating}/5.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold text-espresso">
                Rate this trip
              </p>
              <div
                className="mt-2 flex items-center gap-1"
                role="group"
                aria-label={`Rate ${trip.title}`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onRateTrip(trip.id, star)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-smoke bg-white text-sm text-amber transition-colors hover:bg-amber/10"
                    aria-label={`Rate ${star} out of 5`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

import { WishlistButton } from "../../../shared/ui";
import type { Destination } from "../types";
import { RatingBadge } from "./RatingBadge";

interface DestinationCardProps {
  destination: Destination;
  onStartTrip: (destination: string) => void;
  isSaved: boolean;
  onToggleSave: (id: number) => void;
  recommendation?: boolean;
}

export function DestinationCard({
  destination,
  onStartTrip,
  isSaved,
  onToggleSave,
  recommendation = false,
}: DestinationCardProps) {
  if (recommendation) {
    return (
      <article className="group grid h-full grid-cols-[112px_1fr] overflow-hidden rounded-[1.25rem] border border-smoke/80 bg-white/72 shadow-[0_10px_28px_rgba(28,17,8,0.035)] sm:block">
        <div className="aspect-square overflow-hidden bg-smoke sm:aspect-[1.35]">
          <img
            src={destination.imageUrl}
            alt={`${destination.name}, ${destination.country}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {destination.region}
          </p>
          <h3 className="text-xl font-semibold text-espresso">
            {destination.name}
          </h3>
          <p className="text-sm text-flint">{destination.country}</p>
          <button
            type="button"
            onClick={() => onStartTrip(destination.destination)}
            className="mt-auto inline-flex min-h-11 items-center justify-start rounded-full text-sm font-semibold text-amber transition-colors hover:text-amber-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
          >
            Start Trip
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-smoke/75 bg-white/82 shadow-[0_10px_30px_rgba(28,17,8,0.035)]">
      <div className="relative aspect-[1.22] overflow-hidden bg-smoke">
        <img
          src={destination.imageUrl}
          alt={`${destination.name}, ${destination.country}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/62 via-black/18 to-transparent px-4 pb-4 pt-16 text-white" />
        {destination.moods.includes("Trending") ? (
          <span className="absolute left-3 top-3 rounded-full bg-[#1C1108]/58 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            Trending
          </span>
        ) : null}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <RatingBadge rating={destination.rating} />
          <WishlistButton
            isSaved={isSaved}
            onToggle={() => onToggleSave(destination.id)}
            className="min-h-9 min-w-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/85"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {destination.region}
          </p>
          <h3 className="mt-1 text-[1.55rem] font-semibold text-espresso">
            {destination.name}
          </h3>
          <p className="mt-1 text-sm text-flint">{destination.country}</p>
        </div>

        <p className="text-sm leading-relaxed text-flint">
          {destination.summary}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-smoke/70 pt-3 text-xs font-medium text-muted">
          <span>{destination.season}</span>
          <span>{destination.bestFor}</span>
        </div>
        <button
          type="button"
          onClick={() => onStartTrip(destination.destination)}
          className="inline-flex min-h-11 items-center justify-start rounded-full text-sm font-semibold text-amber transition-colors hover:text-amber-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
        >
          Start Trip
        </button>
      </div>
    </article>
  );
}

import { WishlistButton } from "../../../shared/ui";
import type { Destination } from "../types";
import { RatingBadge } from "./RatingBadge";

interface FeaturedDestinationCardProps {
  destination: Destination;
  onStartTrip: (destination: string) => void;
  isSaved: boolean;
  onToggleSave: (id: number) => void;
}

export function FeaturedDestinationCard({
  destination,
  onStartTrip,
  isSaved,
  onToggleSave,
}: FeaturedDestinationCardProps) {
  return (
    <article className="group h-full overflow-hidden rounded-[1.6rem] bg-smoke">
      <div className="relative min-h-[430px] overflow-hidden rounded-[1.6rem]">
        <img
          src={destination.imageUrl}
          alt={`${destination.name}, ${destination.country}`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/18 to-black/8" />
        <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            {destination.moods.includes("Trending") ? "Trending" : "Featured"}
          </span>
          <div className="flex items-center gap-2">
            <RatingBadge rating={destination.rating} />
            <WishlistButton
              isSaved={isSaved}
              onToggle={() => onToggleSave(destination.id)}
              className="min-h-9 min-w-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/85"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/76">
            {destination.region}
          </p>
          <h3 className="mt-2 max-w-md text-4xl font-semibold leading-[0.98] text-white sm:text-5xl">
            {destination.name}
          </h3>
          <p className="mt-2 text-base font-medium text-white/84">
            {destination.country}
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/82">
            {destination.summary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartTrip(destination.destination)}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-espresso transition-colors hover:bg-parchment focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Start Trip
            </button>
            <span className="text-xs font-medium text-white/76">
              {destination.season}
              {destination.dailyBudget ? ` / ${destination.dailyBudget}` : ""}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

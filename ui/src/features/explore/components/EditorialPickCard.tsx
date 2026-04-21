import type { Destination } from "../../shared/types/destination.types";

interface EditorialPickCardProps {
  destination: Destination;
  onStartTrip: (destination: string) => void;
}

export function EditorialPickCard({
  destination,
  onStartTrip,
}: EditorialPickCardProps) {
  return (
    <article className="group h-full overflow-hidden rounded-[1.45rem] bg-smoke">
      <button
        type="button"
        onClick={() => onStartTrip(destination.destination)}
        className="relative block h-full w-full overflow-hidden rounded-[1.45rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        <div className="aspect-[3/4] min-h-[330px] overflow-hidden">
          <img
            src={destination.imageUrl}
            alt={`${destination.name}, ${destination.country}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-black/0" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
            {destination.moods[0]}
          </p>
          <h3 className="mt-2 text-3xl font-semibold leading-none text-white">
            {destination.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-white/82">
            {destination.country}
          </p>
          <span className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/38 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors group-hover:bg-white/20">
            Start Trip
          </span>
        </div>
      </button>
    </article>
  );
}

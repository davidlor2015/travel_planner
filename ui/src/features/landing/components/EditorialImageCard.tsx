import { ActionButton } from "../../../shared/ui";
import type { LandingDestination } from "../landing.types";

interface EditorialImageCardProps {
  destination: LandingDestination;
  onGetStarted: () => void;
}

export function EditorialImageCard({
  destination,
  onGetStarted,
}: EditorialImageCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-smoke bg-white shadow-[0_12px_34px_rgba(28,17,8,0.07)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-smoke">
        <img
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/76">
            {destination.tag}
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-white">
            {destination.name}
          </h3>
          <p className="text-sm text-white/82">{destination.country}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <p className="text-sm text-flint">Turn this idea into a shared plan.</p>
        <ActionButton onClick={onGetStarted}>Start</ActionButton>
      </div>
    </article>
  );
}

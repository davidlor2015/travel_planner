import type { Trip, TripOnTripSnapshot, TripOnTripStopSnapshot } from "../../../shared/api/trips";

function resolutionLabel(stop: TripOnTripStopSnapshot): string {
  const sourceLabel: Record<TripOnTripStopSnapshot["source"], string> = {
    day_date_exact: "date match",
    trip_day_offset: "trip day offset",
    itinerary_sequence: "itinerary order",
    ambiguous: "ambiguous",
    none: "unresolved",
  };
  return `${sourceLabel[stop.source]} · ${stop.confidence} confidence`;
}

function stopHeading(stop: TripOnTripStopSnapshot): string {
  return stop.title ?? "Not resolved yet";
}

function stopSubline(stop: TripOnTripStopSnapshot): string {
  const time = stop.time?.trim() || "time TBD";
  const place = stop.location?.trim() || "location TBD";
  if (!stop.title) {
    return resolutionLabel(stop);
  }
  return `${time} · ${place}`;
}

export function OnTripCompactMode({
  trip,
  snapshot,
  onOpenFullWorkspace,
}: {
  trip: Trip;
  snapshot: TripOnTripSnapshot;
  onOpenFullWorkspace: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_18px_55px_rgba(28,17,8,0.08)]">
      <div className="border-b border-[#EDE7DD] bg-[#FAF8F5]/80 px-5 py-4 sm:px-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
          On-Trip mode
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#1C1108]">
          {trip.title}
        </h2>
        <p className="mt-1 text-sm text-[#6B5E52]">
          Compact execution view while traveling.
        </p>
      </div>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 sm:px-7">
        <article className="rounded-2xl border border-[#EDE7DD] bg-[#FAF8F5]/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
            Today
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C1108]">
            {stopHeading(snapshot.today)}
          </p>
          <p className="mt-1 text-xs text-[#6B5E52]">{stopSubline(snapshot.today)}</p>
          <p className="mt-1 text-[11px] text-[#A39688]">
            {resolutionLabel(snapshot.today)}
          </p>
        </article>

        <article className="rounded-2xl border border-[#EDE7DD] bg-[#FAF8F5]/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
            Next stop
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C1108]">
            {stopHeading(snapshot.next_stop)}
          </p>
          <p className="mt-1 text-xs text-[#6B5E52]">{stopSubline(snapshot.next_stop)}</p>
          <p className="mt-1 text-[11px] text-[#A39688]">
            {resolutionLabel(snapshot.next_stop)}
          </p>
        </article>
      </div>

      <div className="border-t border-[#EDE7DD] px-5 py-4 sm:px-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
          Active blockers
        </p>
        {snapshot.blockers.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B5E52]">
            No active travel blockers surfaced right now.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.blockers.map((blocker) => (
              <li
                key={blocker.id}
                className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2"
              >
                <p className="text-xs font-semibold text-danger">{blocker.title}</p>
                <p className="mt-0.5 text-xs text-danger/90">{blocker.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[#EDE7DD] px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={onOpenFullWorkspace}
          className="inline-flex min-h-10 items-center rounded-full bg-[#1C1108] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2B1B0F]"
        >
          Open full workspace
        </button>
      </div>
    </section>
  );
}

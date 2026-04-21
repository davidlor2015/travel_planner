import { ItineraryMap } from "../../ItineraryMap";
import type { Itinerary, ItineraryItem } from "../../../../shared/api/ai";

interface MapTabProps {
  tripId: number;
  itinerary: Itinerary | null;
}

const TYPE_COLORS: Record<string, string> = {
  transport: "#4D6B8A",
  stay: "#B86845",
  activity: "#6A7A43",
  dining: "#C89A3C",
  leisure: "#7A5A8B",
};

const TYPE_LABELS: Record<string, string> = {
  transport: "Transport",
  stay: "Stay",
  activity: "Activity",
  dining: "Dining",
  leisure: "Leisure",
};

function inferType(item: ItineraryItem): string {
  const v = `${item.title} ${item.location ?? ""} ${item.notes ?? ""}`.toLowerCase();
  if (/flight|airport|train|bus|taxi|transfer|ferry|arrive|depart/.test(v)) return "transport";
  if (/hotel|villa|stay|check.in|resort|riad|inn|lodging/.test(v)) return "stay";
  if (/lunch|dinner|breakfast|cafe|coffee|restaurant|meal|tasting|bar|wine/.test(v)) return "dining";
  if (/beach|wander|walk|garden|spa|sunset|free time|market|stroll/.test(v)) return "leisure";
  return "activity";
}

export function MapTab({ tripId, itinerary }: MapTabProps) {
  if (!itinerary) {
    return (
      <div className="rounded-3xl border border-dashed border-smoke bg-parchment/40 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-espresso">Map unavailable</p>
        <p className="mt-1 text-sm text-flint">
          Save a shared itinerary first to unlock the trip map for everyone on this trip.
        </p>
      </div>
    );
  }

  const stopCount = itinerary.days.reduce((total, day) => total + day.items.length, 0);
  const allItems = itinerary.days.flatMap((d) => d.items);

  return (
    <section className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex min-h-7 items-center rounded-full border border-[#E5DDD1] bg-white px-2.5 py-1 font-semibold text-[#6B5E52]">
          {itinerary.days.length} day{itinerary.days.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex min-h-7 items-center rounded-full border border-[#E5DDD1] bg-white px-2.5 py-1 font-semibold text-[#6B5E52]">
          {stopCount} mapped stop{stopCount === 1 ? "" : "s"}
        </span>
      </div>

      {/* Map */}
      <ItineraryMap key={`trip-map-${tripId}`} itinerary={itinerary} />

      {/* Location list */}
      {allItems.length > 0 && (
        <div className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Stops</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allItems.filter((item) => item.location).slice(0, 9).map((item, i) => {
              const type = inferType(item);
              const color = TYPE_COLORS[type] ?? "#A39688";
              const label = TYPE_LABELS[type] ?? "Stop";
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#EAE2D6] bg-white px-4 py-3"
                >
                  <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1C1108]">{item.location}</p>
                    <p className="text-[11px] text-[#A39688]">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

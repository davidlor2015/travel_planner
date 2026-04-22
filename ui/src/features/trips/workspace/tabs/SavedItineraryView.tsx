import type { Itinerary, ItineraryItem } from "../../../../shared/api/ai";

interface SavedItineraryViewProps {
  itinerary: Itinerary;
  onEnterEdit: () => void;
}

function formatDayDate(date: string | null): string {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function stopSecondary(item: ItineraryItem): string | null {
  const parts = [item.location, item.cost_estimate]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Calm read view of a saved itinerary — the post-save state of the trip.
 *
 * Design intent:
 *  - No "Draft" chip, no "Publish", no "Assist" CTAs on every day.
 *  - One owned-by-user header with a single "Edit itinerary" action.
 *  - Timeline reads as the trip, not as an AI output.
 *  - Identical tokens (espresso/parchment/smoke/flint) to the rest of the app,
 *    so this is a presentational shell, not a new design system surface.
 *
 * When the user clicks "Edit itinerary", the parent loads the saved plan into
 * pending-draft state and the workspace renders EditableItineraryPanel instead.
 */
export function SavedItineraryView({
  itinerary,
  onEnterEdit,
}: SavedItineraryViewProps) {
  const summary = itinerary.summary?.trim() ?? "";
  const days = itinerary.days ?? [];

  return (
    <section
      className="overflow-hidden rounded-2xl border border-smoke/60 bg-white shadow-[0_8px_30px_rgba(28,17,8,0.04)]"
      aria-label="Saved itinerary"
    >
      <header className="border-b border-smoke/60 px-5 pt-6 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg font-semibold leading-tight text-espresso">
              {itinerary.title}
            </h4>
            {summary ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-flint">
                {summary}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onEnterEdit}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-smoke bg-parchment px-4 text-sm font-semibold text-espresso transition-colors hover:bg-smoke/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/30"
          >
            Edit itinerary
          </button>
        </div>
      </header>

      {days.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-flint">
          No days in this itinerary yet. Click{" "}
          <span className="font-medium text-espresso">Edit itinerary</span> to
          add one.
        </div>
      ) : (
        <div className="space-y-6 px-4 pb-6 pt-4 sm:px-5">
          {days.map((day) => {
            const dayTitle = day.day_title?.trim() || `Day ${day.day_number}`;
            const formattedDate = formatDayDate(day.date);
            const stopCount = day.items.length;
            return (
              <article
                key={day.day_number}
                className="rounded-2xl border border-smoke/50 bg-[#FEFCF9] px-4 py-5 sm:px-5"
                aria-labelledby={`saved-day-${day.day_number}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-espresso text-xs font-bold text-ivory"
                    aria-hidden
                  >
                    {day.day_number}
                  </span>
                  <div className="min-w-0">
                    <h3
                      id={`saved-day-${day.day_number}`}
                      className="font-display text-base font-semibold leading-tight text-espresso"
                    >
                      {dayTitle}
                    </h3>
                    {formattedDate ? (
                      <p className="mt-0.5 text-[13px] text-flint">
                        {formattedDate}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-flint/95">
                      {stopCount === 0
                        ? "No stops yet"
                        : `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`}
                    </p>
                  </div>
                </div>

                {day.items.length > 0 ? (
                  <ol className="mt-4 space-y-3">
                    {day.items.map((item, index) => {
                      const secondary = stopSecondary(item);
                      const title = item.title?.trim() || "Untitled stop";
                      const time = item.time?.trim();
                      return (
                        <li
                          key={`${day.day_number}-${index}`}
                          className="flex gap-3 rounded-xl px-1 py-1"
                        >
                          <span
                            className="shrink-0 pt-0.5 text-[11px] font-semibold text-flint tabular-nums"
                            aria-hidden
                          >
                            {time ? time : "—"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-espresso">
                              {title}
                            </p>
                            {secondary ? (
                              <p className="mt-0.5 text-[12px] text-flint">
                                {secondary}
                              </p>
                            ) : null}
                            {item.notes?.trim() ? (
                              <p className="mt-1 text-[12px] leading-relaxed text-flint/90">
                                {item.notes.trim()}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-4 text-[12px] text-flint/80">
                    Nothing scheduled for this day.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

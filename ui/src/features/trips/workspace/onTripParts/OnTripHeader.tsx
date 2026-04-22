import type { Trip } from "../../../../shared/api/trips";

function formatDayDate(dayDate: string | null): string {
  if (!dayDate) return "";
  // Append noon to prevent midnight-UTC timezone shifts from moving the date.
  const d = new Date(`${dayDate}T12:00:00`);
  const weekday = d.toLocaleDateString("en", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

function ReadOnlyBadge() {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#e4dbcb] bg-[#fbf7ef] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#6b5743]"
      title="Execution updates are disabled for this trip."
      aria-label="Read-only mode: execution updates are disabled"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      Read-only
    </span>
  );
}

export function OnTripHeader({
  trip,
  readOnly,
  dayNumber,
  dayDate,
  progressPct,
  doneCount,
  totalCount,
  leadingActions,
}: {
  trip: Trip;
  readOnly: boolean;
  dayNumber: number | null;
  dayDate: string | null;
  progressPct: number;
  doneCount: number;
  totalCount: number;
  leadingActions?: React.ReactNode;
}) {
  const dayLabel = formatDayDate(dayDate);
  const hasProgress = totalCount > 0;

  return (
    <div className="px-6 pt-5 pb-3 sm:px-8">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="whitespace-nowrap text-[11px] font-normal uppercase tracking-[0.22em] text-[#b4532a]">
            On-Trip
          </span>
          {dayNumber != null || dayLabel ? (
            <>
              <span
                aria-hidden
                className="h-1 w-1 flex-shrink-0 rounded-full bg-[#c9bca8]"
              />
              <span className="truncate text-[11px] font-normal uppercase tracking-[0.22em] text-[#8a7866]">
                {dayNumber != null ? `Day ${dayNumber}` : ""}
                {dayNumber != null && dayLabel ? " · " : ""}
                {dayLabel}
              </span>
            </>
          ) : null}
          {readOnly ? <ReadOnlyBadge /> : null}
        </div>

        {/* Right: optional activity button + progress */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {leadingActions}
          {hasProgress ? (
            <div className="flex items-center gap-2">
              <div className="h-[3px] w-16 overflow-hidden rounded-full bg-[#ece4d7]">
                <div
                  className="h-full rounded-full bg-[rgba(180,83,42,0.8)] transition-[width] duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-[11px] font-normal uppercase tracking-[0.14em] text-[#8a7866]">
                {doneCount} of {totalCount} done
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Trip display title */}
      <h2 className="mt-1.5 font-display text-[1.6rem] font-medium leading-[1.1] tracking-[-0.01em] text-[#2a1d13] sm:text-[1.75rem]">
        {trip.title}
      </h2>
    </div>
  );
}

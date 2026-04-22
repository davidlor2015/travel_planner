import type { TripOnTripUnplannedStop } from "../../../../shared/api/trips";

// Generic map-pin icon for all unplanned stops (we have no category metadata)
function MapPinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

export function UnplannedList({
  stops,
  onRemove,
  onLogStop,
  isLoggingDisabled = false,
}: {
  stops: Array<TripOnTripUnplannedStop & { isPending: boolean }>;
  onRemove: (eventId: number) => void;
  /** Desktop in-flow "Log a stop" trigger — hidden on mobile (FAB handles that) */
  onLogStop?: () => void;
  isLoggingDisabled?: boolean;
  /** @deprecated use onRemove only; navigation is handled by the stop itself */
  onNavigate?: (eventId: number) => void;
}) {
  const isEmpty = stops.length === 0;

  return (
    <div className="px-6 sm:px-8 lg:px-0">
      {/* Section header */}
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[22px] font-medium text-[#2a1d13]">
          Along the way
        </h3>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#8a7866]">
          Unplanned
        </span>
      </div>
      <p className="mt-1 text-[12px] text-[#8a7866]">
        {isEmpty
          ? "Nothing logged yet — tap Log a stop to capture a detour."
          : "Little detours worth remembering."}
      </p>

      {/* Rows */}
      {isEmpty ? null : (
      <ul className="mt-4 list-none p-0" style={{ margin: 0, marginTop: "1rem" }}>
        {stops.map((stop, index) => {
          const metaParts: string[] = [];
          if (stop.time?.trim()) metaParts.push(stop.time.trim());
          if (stop.location?.trim()) metaParts.push(stop.location.trim());
          const meta = metaParts.join(" · ");

          return (
            <li
              key={stop.event_id}
              className={`flex items-center gap-3 py-3.5 ${
                index < stops.length - 1
                  ? "border-b border-[#e4dbcb]"
                  : ""
              }`}
            >
              {/* Icon circle */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(236,228,215,0.7)] text-[#6b5743]">
                <MapPinIcon />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-[#3a2a1f]">
                  {stop.title}
                </p>
                {meta ? (
                  <p className="mt-0.5 truncate text-[12px] text-[#8a7866]">
                    {meta}
                  </p>
                ) : null}
                {stop.notes ? (
                  <p className="mt-0.5 truncate text-[12px] italic text-[#8a7866]">
                    {stop.notes}
                  </p>
                ) : null}
              </div>

              {/* Remove button */}
              <button
                type="button"
                disabled={stop.isPending}
                onClick={() => onRemove(stop.event_id)}
                aria-label={`Remove ${stop.title}`}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#8a7866] opacity-60 transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
              >
                <TrashIcon />
              </button>
            </li>
          );
        })}
      </ul>
      )}

      {/* Desktop in-flow Log a stop trigger — mobile uses the floating FAB */}
      {onLogStop ? (
        <div className="mt-5 hidden lg:flex">
          <button
            type="button"
            disabled={isLoggingDisabled}
            onClick={onLogStop}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2a1d13] px-4 py-2 text-[13px] font-medium text-[#f2ebdd] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden className="text-base leading-none">
              +
            </span>
            Log a stop
          </button>
        </div>
      ) : null}
    </div>
  );
}

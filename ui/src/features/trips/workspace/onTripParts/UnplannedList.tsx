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

function LogStopButton({
  onLogStop,
  disabled,
  tone,
}: {
  onLogStop: () => void;
  disabled: boolean;
  tone: "solid" | "soft";
}) {
  const base =
    "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const toneClass =
    tone === "solid"
      ? "bg-[#2a1d13] text-[#f2ebdd] hover:bg-[#3a2a1f]"
      : "border border-[#c9b99a] bg-[#fbf7ef] text-[#2a1d13] hover:border-[#6b5743] hover:bg-[#ece4d7]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onLogStop}
      className={`${base} ${toneClass}`}
    >
      <span aria-hidden className="text-base leading-none">
        +
      </span>
      Log a stop
    </button>
  );
}

export function UnplannedList({
  stops,
  onRemove,
  onLogStop,
  isLoggingDisabled = false,
  readOnly = false,
}: {
  stops: Array<TripOnTripUnplannedStop & { isPending: boolean }>;
  onRemove: (eventId: number) => void;
  /** Desktop in-flow "Log a stop" trigger — hidden on mobile (FAB handles that) */
  onLogStop?: () => void;
  isLoggingDisabled?: boolean;
  /**
   * When true, the section renders rows as informational state only:
   * no Log-a-stop CTA, no per-row Remove. Matches the read-only rule that
   * execution affordances are hidden rather than shown disabled.
   */
  readOnly?: boolean;
  /** @deprecated use onRemove only; navigation is handled by the stop itself */
  onNavigate?: (eventId: number) => void;
}) {
  const isEmpty = stops.length === 0;
  const showLogStop = Boolean(onLogStop) && !readOnly;

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

      {/* Empty state: designed card with soft icon, two-line copy, inline trigger.
          Non-empty state: brief supporting line + rows + inline trigger below. */}
      {isEmpty ? (
        <div className="mt-4 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-[#d7c9b0] bg-[rgba(236,228,215,0.35)] px-5 py-6 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#fbf7ef] text-[#8a7866]">
            <MapPinIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[#3a2a1f]">
              Nothing logged yet
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-[#8a7866]">
              Capture a detour, coffee break, or photo op as it happens — we'll keep it with the day.
            </p>
          </div>
          {showLogStop && onLogStop ? (
            <div className="hidden flex-shrink-0 lg:block">
              <LogStopButton
                onLogStop={onLogStop}
                disabled={isLoggingDisabled}
                tone="soft"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-1 text-[12px] text-[#8a7866]">
            Little detours worth remembering.
          </p>
          <ul className="list-none p-0" style={{ margin: 0, marginTop: "1rem" }}>
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

                  {/* Remove button — omitted in read-only mode */}
                  {readOnly ? null : (
                    <button
                      type="button"
                      disabled={stop.isPending}
                      onClick={() => onRemove(stop.event_id)}
                      aria-label={`Remove ${stop.title}`}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#8a7866] opacity-60 transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Desktop in-flow Log a stop trigger — mobile uses the floating FAB */}
          {showLogStop && onLogStop ? (
            <div className="mt-5 hidden lg:flex">
              <LogStopButton
                onLogStop={onLogStop}
                disabled={isLoggingDisabled}
                tone="solid"
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

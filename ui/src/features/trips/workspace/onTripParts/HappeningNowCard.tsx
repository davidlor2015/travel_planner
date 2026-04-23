import { mapsDirectionsHref } from "../mapLinks";
import type { StopVM } from "./types";

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function HappeningNowCard({
  stop,
  variant = "full",
  onNavigate,
  onConfirm,
  onSkip,
  onReset,
}: {
  stop: StopVM;
  variant?: "full" | "compact";
  onNavigate?: () => void;
  onConfirm: () => void;
  onSkip: () => void;
  onReset: () => void;
}) {
  const mapsHref = mapsDirectionsHref(stop);
  const canMutate = !stop.isReadOnly && Boolean(stop.stop_ref) && !stop.isPending;
  const status = stop.effectiveStatus;
  const compact = variant === "compact";

  const containerClass = compact
    ? "rounded-[22px] border border-surface-exec-top bg-gradient-to-b from-surface-exec-top to-surface-exec px-5 py-5"
    : "rounded-[26px] bg-gradient-to-b from-surface-exec-top to-surface-exec px-7 py-7 shadow-[0px_20px_40px_0px_rgba(58,42,31,0.4)]";
  const titleClass = compact
    ? "mt-3 font-display text-[1.2rem] font-medium leading-[1.2] text-on-dark"
    : "mt-4 font-display text-[1.75rem] font-medium leading-[1.1] text-on-dark";
  const navigateClass = compact
    ? "mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-on-dark px-4 py-2.5 text-[14px] font-medium text-ontrip transition-opacity hover:opacity-90"
    : "mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-on-dark px-4 py-3 text-[16px] font-medium text-ontrip shadow-[0_6px_14px_rgba(0,0,0,0.4)] transition-opacity hover:opacity-90";
  const actionBtnClass = compact
    ? "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const resetSize = compact ? "h-9 w-9" : "h-11 w-11";

  return (
    <div className={containerClass}>
      {/* "• HAPPENING NOW" + current time */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-1 w-1 flex-shrink-0 rounded-full bg-accent-ontrip"
            style={{ opacity: 0.84 }}
          />
          <span className="text-[11px] font-normal uppercase tracking-[0.22em] text-on-dark-soft">
            Happening now
          </span>
        </div>
        <span className="text-xs text-on-dark-muted">{localTimeHHMM()}</span>
      </div>

      {/* Stop title */}
      <p className={titleClass}>
        {stop.title ?? "Untitled stop"}
      </p>

      {/* Location */}
      {stop.location?.trim() ? (
        <div className="mt-3 flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9bca8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate text-[13px] text-on-dark-muted">
            {stop.location.trim()}
            {stop.time?.trim() ? ` · ${stop.time.trim()}` : ""}
          </span>
        </div>
      ) : null}

      {/* Full-width Navigate button */}
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={navigateClass}
          aria-label={`Navigate to ${stop.title ?? "stop"}`}
        >
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
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Navigate
        </a>
      ) : null}

      {/* Action row: Confirm | Skip | Reset (optional).
          In read-only mode, execution affordances are omitted entirely — the
          informational Read-only badge in the header is the single source of
          that state. */}
      {stop.isReadOnly ? null : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!canMutate}
            onClick={onConfirm}
            aria-pressed={status === "confirmed"}
            className={`${actionBtnClass} border-on-dark bg-on-dark text-ontrip`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {status === "confirmed" ? "Confirmed" : "Confirm"}
          </button>

          <button
            type="button"
            disabled={!canMutate}
            onClick={onSkip}
            aria-pressed={status === "skipped"}
            className={`${actionBtnClass} border-exec text-on-dark-soft`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {status === "skipped" ? "Skipped" : "Skip"}
          </button>

          {/* Reset circle — only when already actioned */}
          {stop.stop_ref && (status === "confirmed" || status === "skipped") ? (
            <button
              type="button"
              disabled={!canMutate}
              onClick={onReset}
              aria-label="Reset to planned"
              className={`flex ${resetSize} flex-shrink-0 items-center justify-center rounded-full border border-exec text-on-dark-muted transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

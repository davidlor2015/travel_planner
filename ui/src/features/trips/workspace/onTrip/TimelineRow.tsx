import { mapsDirectionsHref } from "../helpers/mapLinks";
import type { TimelineRowVM } from "./types";

// ── Dot appearance per variant ────────────────────────────────────────────────

type DotSpec = { size: string; bg: string; border?: string };

function dotSpec(variant: TimelineRowVM["variant"]): DotSpec {
  switch (variant) {
    case "now":
      // Larger filled clay-accent dot
      return { size: "size-3", bg: "bg-accent-ontrip" };
    case "next":
      // Hollow dot with dark border
      return { size: "size-2.5", bg: "bg-surface-ontrip-raised", border: "border border-surface-exec-top" };
    case "done":
    case "blocked":
      // Smallest filled light dot
      return { size: "size-2", bg: "bg-border-strong" };
    default:
      // Upcoming — hollow light border
      return { size: "size-2", bg: "bg-surface-ontrip-raised", border: "border border-on-dark-muted" };
  }
}

// ── Navigate icon ─────────────────────────────────────────────────────────────

function NavigateIcon() {
  return (
    <svg
      width="13"
      height="13"
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
  );
}

// ── Single row ────────────────────────────────────────────────────────────────

export function TimelineRow({
  row,
  isLast = false,
}: {
  row: TimelineRowVM;
  isLast?: boolean;
}) {
  const stop = row.stop;
  const mapsHref = mapsDirectionsHref(stop);
  const dot = dotSpec(row.variant);
  const onNavigate =
    "onNavigate" in row && typeof row.onNavigate === "function"
      ? row.onNavigate
      : undefined;
  const canMutate =
    !stop.isReadOnly && Boolean(stop.stop_ref) && !stop.isPending;

  // ── Time column text ──────────────────────────────────────────────────────
  const timeText = stop.time?.trim() ?? "";
  const isDone = row.variant === "done";
  const isNowOrNext = row.variant === "now" || row.variant === "next";

  const timeClass = isDone
    ? "text-ontrip-soft tracking-[0.1em]"
    : isNowOrNext
      ? "uppercase tracking-[0.14em] text-ontrip-muted"
      : "uppercase tracking-[0.14em] text-ontrip-muted";

  // ── Row wrapper opacity for done rows ─────────────────────────────────────
  const rowOpacity = isDone ? "opacity-75" : "";
  const isNow = row.variant === "now";
  const contentPadding = isNow ? "pb-6" : "pb-5";

  return (
    <li
      className={`flex items-start gap-5 ${rowOpacity}`}
      data-stop-key={stop.key}
    >
      {/* Left: time column */}
      <div className="w-14 flex-shrink-0 pt-0.5">
        <span className={`block text-right text-[12px] font-normal leading-[18px] ${timeClass}`}>
          {timeText}
        </span>
      </div>

      {/* Center: dot + connector line */}
      <div className="flex w-3 flex-shrink-0 flex-col items-center pt-1.5">
        {isNow ? (
          <span
            data-now-halo
            className="flex flex-shrink-0 items-center justify-center rounded-full bg-accent-ontrip/14 p-1"
          >
            <span
              className={`flex-shrink-0 rounded-full ${dot.size} ${dot.bg} ${dot.border ?? ""}`}
            />
          </span>
        ) : (
          <span
            className={`flex-shrink-0 rounded-full ${dot.size} ${dot.bg} ${dot.border ?? ""}`}
          />
        )}
        {!isLast ? (
          <span className="mt-1 w-px flex-1 bg-surface-ontrip-sunken" style={{ minHeight: "24px" }} />
        ) : null}
      </div>

      {/* Right: content (variant-specific) */}
      <div className={`min-w-0 flex-1 ${contentPadding}`}>
        {row.variant === "done" && <DoneContent stop={stop} />}
        {row.variant === "now" && <NowContent stop={stop} />}
        {row.variant === "next" && (
          <NextContent
            stop={stop}
            mapsHref={mapsHref}
            canMutate={canMutate}
            onNavigate={onNavigate}
            onConfirm={row.onConfirm}
            onSkip={row.onSkip}
          />
        )}
        {row.variant === "upcoming" && (
          <UpcomingContent stop={stop} mapsHref={mapsHref} />
        )}
        {row.variant === "blocked" && (
          <BlockedContent stop={stop} reason={row.reason} />
        )}
      </div>
    </li>
  );
}

// ── Variant sub-renders ───────────────────────────────────────────────────────

function DoneContent({ stop }: { stop: TimelineRowVM["stop"] }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="truncate text-[14px] text-ontrip-muted">
        {stop.title ?? "Untitled stop"}
      </p>
      <span className="flex-shrink-0 text-[11px] uppercase tracking-[0.14em] text-ontrip-soft">
        Done
      </span>
    </div>
  );
}

function NowContent({ stop }: { stop: TimelineRowVM["stop"] }) {
  return (
    <div>
      {/* "• NOW" state label */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-1 w-1 flex-shrink-0 rounded-full bg-accent-ontrip"
          style={{ opacity: 0.84 }}
        />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent-ontrip">
          Now
        </span>
      </div>
      <p className="mt-1.5 font-display text-[19px] font-semibold leading-[1.3] text-ontrip">
        {stop.title ?? "Untitled stop"}
      </p>
      {stop.location?.trim() ? (
        <p className="mt-1 truncate text-[13px] text-ontrip-strong">
          {stop.location.trim()}
        </p>
      ) : null}
    </div>
  );
}

function NextContent({
  stop,
  mapsHref,
  canMutate,
  onNavigate,
  onConfirm,
  onSkip,
}: {
  stop: TimelineRowVM["stop"];
  mapsHref: string | null;
  canMutate: boolean;
  onNavigate?: () => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  return (
    <div>
      {/* Top row: state label + "Go" link */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ontrip-muted">
            Next
          </span>
          <p className="mt-1 text-[16px] font-medium leading-[1.375] text-ontrip">
            {stop.title ?? "Untitled stop"}
          </p>
          {stop.location?.trim() ? (
            <p className="mt-0.5 truncate text-[13px] text-ontrip-muted">
              {stop.location.trim()}
            </p>
          ) : null}
        </div>
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="inline-flex min-h-8 flex-shrink-0 items-center gap-1.5 rounded-full border border-border-ontrip-strong bg-surface-ontrip-raised px-3 py-1.5 text-[13px] font-medium text-ontrip transition-colors hover:border-border-exec hover:bg-surface-ontrip-sunken"
            aria-label={`Navigate to ${stop.title ?? "stop"}`}
          >
            <NavigateIcon />
            Go
          </a>
        ) : null}
      </div>

      {/* Mid-weight Confirm / Skip pills — unified cluster with Go.
          Hidden entirely in read-only mode; the Go link remains above. */}
      {stop.isReadOnly ? null : (
        <div
          className="mt-3 flex items-center gap-2 text-[13px]"
          role="group"
          aria-label="Update status"
        >
          <button
            type="button"
            disabled={!canMutate}
            onClick={onConfirm}
            aria-pressed={stop.effectiveStatus === "confirmed"}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-ontrip-strong bg-surface-ontrip-raised px-3 py-1.5 font-medium text-ontrip transition-colors hover:border-border-exec hover:bg-surface-ontrip-sunken disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Confirm
          </button>
          <button
            type="button"
            disabled={!canMutate}
            onClick={onSkip}
            aria-pressed={stop.effectiveStatus === "skipped"}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-ontrip bg-transparent px-3 py-1.5 font-medium text-ontrip-strong transition-colors hover:border-on-dark-muted hover:bg-surface-ontrip-sunken hover:text-ontrip disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function UpcomingContent({
  stop,
  mapsHref,
}: {
  stop: TimelineRowVM["stop"];
  mapsHref: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-[1.375] text-surface-exec-top/85">
          {stop.title ?? "Untitled stop"}
        </p>
        {stop.location?.trim() ? (
          <p className="mt-0.5 truncate text-[13px] text-ontrip-soft">
            {stop.location.trim()}
          </p>
        ) : null}
      </div>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ontrip-muted transition-colors hover:bg-surface-ontrip-sunken hover:text-ontrip"
          aria-label={`Navigate to ${stop.title ?? "stop"}`}
        >
          <NavigateIcon />
          Go
        </a>
      ) : null}
    </div>
  );
}

function BlockedContent({
  stop,
  reason,
}: {
  stop: TimelineRowVM["stop"];
  reason: string;
}) {
  return (
    <div>
      <p className="text-[15px] leading-[1.375] text-surface-exec-top/85">
        {stop.title ?? "Untitled stop"}
      </p>
      {reason ? (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-accent-ontrip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {reason}
        </p>
      ) : null}
    </div>
  );
}

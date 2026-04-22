import { mapsDirectionsHref } from "../mapLinks";
import type { TimelineRowVM } from "./types";

// ── Dot appearance per variant ────────────────────────────────────────────────

type DotSpec = { size: string; bg: string; border?: string };

function dotSpec(variant: TimelineRowVM["variant"]): DotSpec {
  switch (variant) {
    case "now":
      // Larger filled clay-accent dot
      return { size: "size-3", bg: "bg-[#b4532a]" };
    case "next":
      // Hollow dot with dark border
      return { size: "size-2.5", bg: "bg-[#fbf7ef]", border: "border border-[#3a2a1f]" };
    case "done":
    case "blocked":
      // Smallest filled light dot
      return { size: "size-2", bg: "bg-[#d4c7b1]" };
    default:
      // Upcoming — hollow light border
      return { size: "size-2", bg: "bg-[#fbf7ef]", border: "border border-[#c9bca8]" };
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
    ? "text-[#a89680] tracking-[0.1em]"
    : isNowOrNext
      ? "uppercase tracking-[0.14em] text-[#8a7866]"
      : "uppercase tracking-[0.14em] text-[#8a7866]";

  // ── Row wrapper opacity for done rows ─────────────────────────────────────
  const rowOpacity = isDone ? "opacity-75" : "";

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
        <span
          className={`flex-shrink-0 rounded-full ${dot.size} ${dot.bg} ${dot.border ?? ""}`}
        />
        {!isLast ? (
          <span className="mt-1 w-px flex-1 bg-[#ece4d7]" style={{ minHeight: "24px" }} />
        ) : null}
      </div>

      {/* Right: content (variant-specific) */}
      <div className="min-w-0 flex-1 pb-5">
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
      <p className="truncate text-[14px] text-[#8a7866]">
        {stop.title ?? "Untitled stop"}
      </p>
      <span className="flex-shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#a89680]">
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
          className="h-1 w-1 flex-shrink-0 rounded-full bg-[#b4532a]"
          style={{ opacity: 0.84 }}
        />
        <span className="text-[11px] uppercase tracking-[0.16em] text-[#b4532a]">
          Now
        </span>
      </div>
      <p className="mt-1 text-[18px] font-medium leading-[1.375] text-[#2a1d13]">
        {stop.title ?? "Untitled stop"}
      </p>
      {stop.location?.trim() ? (
        <p className="mt-0.5 truncate text-[13px] text-[#8a7866]">
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
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#8a7866]">
            Next
          </span>
          <p className="mt-1 text-[16px] font-medium leading-[1.375] text-[#2a1d13]">
            {stop.title ?? "Untitled stop"}
          </p>
          {stop.location?.trim() ? (
            <p className="mt-0.5 truncate text-[13px] text-[#8a7866]">
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
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#3a2a1f] transition-colors hover:bg-[#ece4d7]"
            aria-label={`Navigate to ${stop.title ?? "stop"}`}
          >
            <NavigateIcon />
            Go
          </a>
        ) : null}
      </div>

      {/* Compact inline Confirm + Skip — no more full-width bar */}
      <div
        className="mt-2 flex items-center gap-4 text-[12.5px]"
        role="group"
        aria-label="Update status"
      >
        <button
          type="button"
          disabled={!canMutate}
          onClick={onConfirm}
          aria-pressed={stop.effectiveStatus === "confirmed"}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[#3a2a1f] transition-colors hover:bg-[#ece4d7] hover:text-[#2a1d13] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirm
        </button>
        <button
          type="button"
          disabled={!canMutate}
          onClick={onSkip}
          aria-pressed={stop.effectiveStatus === "skipped"}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[#6b5743] transition-colors hover:bg-[#ece4d7] hover:text-[#2a1d13] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Skip
        </button>
      </div>
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
        <p className="text-[15px] leading-[1.375] text-[rgba(58,42,31,0.85)]">
          {stop.title ?? "Untitled stop"}
        </p>
        {stop.location?.trim() ? (
          <p className="mt-0.5 truncate text-[13px] text-[#a89680]">
            {stop.location.trim()}
          </p>
        ) : null}
      </div>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-[#8a7866] transition-colors hover:bg-[#ece4d7] hover:text-[#2a1d13]"
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
      <p className="text-[15px] leading-[1.375] text-[rgba(58,42,31,0.85)]">
        {stop.title ?? "Untitled stop"}
      </p>
      {reason ? (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#b4532a]">
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

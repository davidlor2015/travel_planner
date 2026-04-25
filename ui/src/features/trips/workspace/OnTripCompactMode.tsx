import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Trip,
  TripExecutionStatus,
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
  UnplannedStopPayload,
} from "../../../shared/api/trips";
import { track } from "../../../shared/analytics";
import { Toast } from "../../../shared/ui/Toast";
import type { MutationFeedback } from "./useOnTripMutations";
import { OnTripHeader } from "./onTrip/OnTripHeader";
import { UnplannedList } from "./onTrip/UnplannedList";
import { NeedsAttentionCard } from "./onTrip/NeedsAttentionCard";
import { LogStopFAB } from "./onTrip/LogStopFAB";
import { LogStopSheet } from "./onTrip/LogStopSheet";
import {
  currentLocalMinutes,
  deriveCurrentStop,
  todayLocalISODate,
} from "./onTrip/deriveCurrentStop";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OnTripCompactModeProps = {
  trip: Trip;
  /** Render-ready snapshot with optimistic overrides already applied. */
  viewSnapshot: TripOnTripSnapshot;
  setStopStatus: (stopRef: string, status: TripExecutionStatus) => Promise<void>;
  /** Returns true while a write is in-flight for the given stop_ref. */
  isUpdatingStop: (stopRef: string) => boolean;
  feedback: MutationFeedback | null;
  dismissFeedback: () => void;
  logUnplannedStop: (payload: UnplannedStopPayload) => Promise<void>;
  removeUnplannedStop: (eventId: number) => Promise<void>;
  isLoggingUnplanned: boolean;
  unplannedPendingIds: Record<number, boolean>;
  onOpenFullWorkspace: () => void;
  activityUnreadCount?: number;
  onOpenActivityDrawer?: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stopEffectiveStatus(stop: TripOnTripStopSnapshot): TripExecutionStatus {
  return stop.execution_status ?? stop.status ?? "planned";
}

function googleMapsHref(location: string | null | undefined): string | null {
  const loc = location?.trim();
  if (!loc) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(loc)}`;
}

// ── Root component ────────────────────────────────────────────────────────────

export function OnTripCompactMode({
  trip,
  viewSnapshot,
  setStopStatus,
  isUpdatingStop,
  feedback,
  dismissFeedback,
  logUnplannedStop,
  removeUnplannedStop,
  isLoggingUnplanned,
  unplannedPendingIds,
  onOpenFullWorkspace,
  activityUnreadCount = 0,
  onOpenActivityDrawer,
}: OnTripCompactModeProps) {
  const toastMessage = feedback?.kind === "error" ? feedback.message : null;
  const readOnly = viewSnapshot.read_only;

  useEffect(() => {
    if (!readOnly) return;
    track({ name: "ontrip_readonly_viewed", props: { trip_id: trip.id } });
  }, [readOnly, trip.id]);

  // Re-derive "now" stop every minute so the highlighted row advances without
  // waiting for a server poll.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setClockTick((n) => (n + 1) % Number.MAX_SAFE_INTEGER),
      60_000,
    );
    return () => window.clearInterval(id);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nowStop = useMemo(
    () => deriveCurrentStop(viewSnapshot.today_stops, currentLocalMinutes()),
    [viewSnapshot.today_stops, clockTick],
  );
  const nowStopRef = nowStop?.stop_ref ?? null;

  const { progressPct, doneCount, totalCount } = useMemo(() => {
    const total = viewSnapshot.today_stops.length;
    if (total === 0) return { progressPct: 0, doneCount: 0, totalCount: 0 };
    const done = viewSnapshot.today_stops.filter(
      (s) =>
        stopEffectiveStatus(s) === "confirmed" || stopEffectiveStatus(s) === "skipped",
    ).length;
    return {
      progressPct: Math.round((done / total) * 100),
      doneCount: done,
      totalCount: total,
    };
  }, [viewSnapshot.today_stops]);

  const defaultLogDate =
    viewSnapshot.today.day_date ||
    viewSnapshot.today_stops[0]?.day_date ||
    todayLocalISODate();

  const [logOpen, setLogOpen] = useState(false);

  const unplannedVM = useMemo(
    () =>
      viewSnapshot.today_unplanned.map((stop) => ({
        ...stop,
        isPending: Boolean(unplannedPendingIds[stop.event_id]),
      })),
    [viewSnapshot.today_unplanned, unplannedPendingIds],
  );

  const handleSetStatus = useCallback(
    (stopRef: string, status: TripExecutionStatus) => {
      track({
        name:
          status === "confirmed"
            ? "ontrip_stop_confirmed"
            : status === "skipped"
              ? "ontrip_stop_skipped"
              : "ontrip_stop_reverted",
        props: { trip_id: trip.id, stop_ref: stopRef },
      });
      void setStopStatus(stopRef, status);
    },
    [setStopStatus, trip.id],
  );

  return (
    <section className="overflow-hidden rounded-[28px] border border-border-ontrip-strong bg-surface-ontrip shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_60px_-32px_rgba(58,42,31,0.28)]">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <OnTripHeader
        trip={trip}
        readOnly={readOnly}
        dayNumber={viewSnapshot.today.day_number}
        dayDate={viewSnapshot.today.day_date}
        progressPct={progressPct}
        doneCount={doneCount}
        totalCount={totalCount}
        leadingActions={
          onOpenActivityDrawer ? (
            <button
              type="button"
              onClick={onOpenActivityDrawer}
              aria-label={
                activityUnreadCount > 0
                  ? `${activityUnreadCount} unread trip updates`
                  : "Open trip updates"
              }
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-ontrip bg-surface-ontrip-raised text-ontrip-strong transition-colors hover:border-ink hover:text-ontrip"
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
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
              {activityUnreadCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-ontrip bg-accent-ontrip"
                />
              ) : null}
            </button>
          ) : null
        }
      />

      {/* Body ────────────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8">
        {/* Today's stop timeline */}
        <div className="max-h-[calc(100dvh-300px)] overflow-y-auto lg:max-h-none lg:overflow-visible">
          {viewSnapshot.today_stops.length === 0 ? (
            <p className="py-4 text-sm text-ontrip-muted">
              No planned stops for today. You can still log what happens below.
            </p>
          ) : (
            <ul className="mt-4" role="list" aria-label="Today's stops">
              {viewSnapshot.today_stops.map((stop, idx) => (
                <TodayStopRow
                  key={stop.stop_ref ?? `row-${idx}`}
                  stop={stop}
                  isLast={idx === viewSnapshot.today_stops.length - 1}
                  isNow={Boolean(stop.stop_ref && stop.stop_ref === nowStopRef)}
                  readOnly={readOnly}
                  isPending={isUpdatingStop(stop.stop_ref ?? "")}
                  onSetStatus={
                    stop.stop_ref
                      ? (status) => handleSetStatus(stop.stop_ref!, status)
                      : undefined
                  }
                />
              ))}
            </ul>
          )}

          {/* Along the way (unplanned) */}
          <div className="mt-8">
            <UnplannedList
              stops={unplannedVM}
              readOnly={readOnly}
              onLogStop={() => {
                track({ name: "ontrip_log_stop_opened", props: { trip_id: trip.id } });
                setLogOpen(true);
              }}
              isLoggingDisabled={isLoggingUnplanned}
              onNavigate={(eventId) => {
                track({
                  name: "ontrip_navigate_clicked",
                  props: { trip_id: trip.id, unplanned_event_id: eventId },
                });
              }}
              onRemove={(eventId) => {
                track({
                  name: "ontrip_unplanned_removed",
                  props: { trip_id: trip.id, unplanned_event_id: eventId },
                });
                void removeUnplannedStop(eventId);
              }}
            />
          </div>

          {viewSnapshot.blockers.length > 0 ? (
            <div className="mt-6 pb-4">
              <NeedsAttentionCard blockers={viewSnapshot.blockers} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border-ontrip px-6 py-5 sm:px-8">
        <p className="text-[13px] text-ontrip-muted">
          The saved itinerary remains your plan of record.
        </p>
        <button
          type="button"
          onClick={onOpenFullWorkspace}
          className="flex-shrink-0 text-[13px] font-medium text-ontrip-muted transition-colors hover:text-ontrip"
        >
          Open full workspace
        </button>
      </div>

      <Toast message={toastMessage} onDismiss={dismissFeedback} />

      {readOnly ? null : (
        <LogStopFAB
          disabled={isLoggingUnplanned}
          onClick={() => {
            track({ name: "ontrip_log_stop_opened", props: { trip_id: trip.id } });
            setLogOpen(true);
          }}
        />
      )}

      <LogStopSheet
        open={logOpen && !readOnly}
        disabled={isLoggingUnplanned}
        defaultDate={defaultLogDate}
        onClose={() => setLogOpen(false)}
        onSubmit={async (payload) => {
          await logUnplannedStop(payload);
          track({
            name: "ontrip_unplanned_logged",
            props: {
              trip_id: trip.id,
              has_time: Boolean(payload.time),
              has_location: Boolean(payload.location),
              has_notes: Boolean(payload.notes),
            },
          });
        }}
      />
    </section>
  );
}

// ── TodayStopRow ──────────────────────────────────────────────────────────────

type TodayStopRowProps = {
  stop: TripOnTripStopSnapshot;
  isLast: boolean;
  isNow: boolean;
  readOnly: boolean;
  isPending: boolean;
  onSetStatus?: (status: TripExecutionStatus) => void;
};

const STATUS_PILLS: { value: TripExecutionStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "skipped", label: "Skipped" },
];

function TodayStopRow({
  stop,
  isLast,
  isNow,
  readOnly,
  isPending,
  onSetStatus,
}: TodayStopRowProps) {
  const current = stopEffectiveStatus(stop);
  const isDone = current === "confirmed" || current === "skipped";
  // Can mutate: writeable trip, known server ref, no write already in-flight.
  const canMutate = !readOnly && Boolean(stop.stop_ref) && !isPending && Boolean(onSetStatus);
  const navHref = googleMapsHref(stop.location);

  function handlePill(pill: TripExecutionStatus) {
    if (!canMutate || !onSetStatus) return;
    // Tapping the active non-planned pill toggles it back to planned.
    if (pill === current && pill !== "planned") {
      onSetStatus("planned");
    } else if (pill !== current) {
      onSetStatus(pill);
    }
  }

  return (
    <li
      className={`flex items-start gap-5 ${isDone ? "opacity-70" : ""}`}
      data-stop-ref={stop.stop_ref ?? undefined}
    >
      {/* Time column */}
      <div className="w-14 flex-shrink-0 pt-0.5">
        <span
          className={`block text-right text-[12px] leading-[18px] ${
            isNow
              ? "font-medium uppercase tracking-[0.14em] text-accent-ontrip"
              : "text-ontrip-muted"
          }`}
        >
          {stop.time?.trim() ?? ""}
        </span>
      </div>

      {/* Dot + connector line */}
      <div className="flex w-3 flex-shrink-0 flex-col items-center pt-1.5">
        {isNow ? (
          <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-accent-ontrip/14 p-1">
            <span className="size-3 flex-shrink-0 rounded-full bg-accent-ontrip" />
          </span>
        ) : isDone ? (
          <span className="size-2 flex-shrink-0 rounded-full bg-border-strong" />
        ) : (
          <span className="size-2 flex-shrink-0 rounded-full border border-on-dark-muted bg-surface-ontrip-raised" />
        )}
        {!isLast ? (
          <span
            className="mt-1 w-px flex-1 bg-surface-ontrip-sunken"
            style={{ minHeight: "24px" }}
          />
        ) : null}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-5">
        <p
          className={`text-[15px] leading-[1.375] ${
            isDone
              ? "line-through text-ontrip-soft"
              : isNow
                ? "font-semibold text-ontrip"
                : "text-ontrip"
          }`}
        >
          {stop.title ?? "Untitled stop"}
        </p>
        {stop.location?.trim() ? (
          <p className="mt-0.5 truncate text-[12px] text-ontrip-muted">
            {stop.location.trim()}
          </p>
        ) : null}

        {/* Status pills + navigate link */}
        <div
          className="mt-2.5 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label={`Status for ${stop.title ?? "stop"}`}
        >
          {STATUS_PILLS.map(({ value, label }) => {
            const isActive = current === value;
            // "Planned" pill is a reset action — only enabled when not already planned.
            const isDisabled =
              !canMutate || (value === "planned" && current === "planned");

            return (
              <button
                key={value}
                type="button"
                disabled={isDisabled}
                aria-pressed={isActive}
                onClick={() => handlePill(value)}
                className={[
                  "inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ontrip/50",
                  "disabled:cursor-default disabled:opacity-50",
                  isActive
                    ? value === "confirmed"
                      ? "border border-accent-ontrip/30 bg-accent-ontrip/10 text-accent-ontrip"
                      : value === "skipped"
                        ? "border border-ontrip-soft/30 bg-surface-ontrip-sunken text-ontrip-muted"
                        : "border border-border-ontrip-strong bg-surface-ontrip-raised text-ontrip-muted"
                    : "border border-border-ontrip bg-transparent text-ontrip-soft hover:border-border-ontrip-strong hover:text-ontrip-muted",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}

          {navHref ? (
            <a
              href={navHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${stop.title ?? "stop"} in Google Maps`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] text-ontrip-muted transition-colors hover:text-ontrip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ontrip/50"
            >
              <NavigateIcon />
              Navigate
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function NavigateIcon() {
  return (
    <svg
      width="11"
      height="11"
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

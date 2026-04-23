import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Trip,
  TripExecutionStatus,
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
} from "../../../shared/api/trips";
import { track } from "../../../shared/analytics";
import { Toast } from "../../../shared/ui/Toast";
import { useOnTripMutations } from "./useOnTripMutations";
import { OnTripHeader } from "./onTripParts/OnTripHeader";
import { HappeningNowCard } from "./onTripParts/HappeningNowCard";
import { DayTimeline } from "./onTripParts/DayTimeline";
import { UnplannedList } from "./onTripParts/UnplannedList";
import { NeedsAttentionCard } from "./onTripParts/NeedsAttentionCard";
import { LogStopFAB } from "./onTripParts/LogStopFAB";
import { LogStopSheet } from "./onTripParts/LogStopSheet";
import type { StopVM } from "./onTripParts/types";
import { deriveStopVisualState } from "./onTripParts/deriveStopVisualState";
import {
  currentLocalMinutes,
  deriveCurrentStop,
  todayLocalISODate,
} from "./onTripParts/deriveCurrentStop";

function effectiveStatus(stop: TripOnTripStopSnapshot): TripExecutionStatus {
  return stop.execution_status ?? stop.status ?? "planned";
}

export function OnTripCompactMode({
  token,
  trip,
  snapshot,
  onOpenFullWorkspace,
  onSnapshotRefresh,
  activityUnreadCount = 0,
  onOpenActivityDrawer,
}: {
  token: string;
  trip: Trip;
  snapshot: TripOnTripSnapshot;
  onOpenFullWorkspace: () => void;
  onSnapshotRefresh: (snapshot: TripOnTripSnapshot) => void;
  activityUnreadCount?: number;
  onOpenActivityDrawer?: () => void;
}) {
  const {
    viewSnapshot,
    statusPending,
    unplannedPendingIds,
    isLoggingUnplanned,
    feedback,
    dismissFeedback,
    setStopStatus,
    logUnplannedStop,
    removeUnplannedStop,
  } = useOnTripMutations({
    token,
    tripId: trip.id,
    snapshot,
    onSnapshotRefresh,
  });

  const toastMessage = feedback?.kind === "error" ? feedback.message : null;

  const currentSnapshot = viewSnapshot ?? snapshot;
  const readOnly = currentSnapshot.read_only;

  useEffect(() => {
    if (!readOnly) return;
    track({
      name: "ontrip_readonly_viewed",
      props: { trip_id: trip.id },
    });
  }, [readOnly, trip.id]);

  // Tick a local clock once a minute so the "current stop" derivation advances
  // between snapshot fetches. Without this, "Now" only rolls over when the
  // server poll lands (~60s) or on a window focus event — which visibly lags
  // in practice. The value itself is unused; it's only a re-render trigger.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setClockTick((n) => (n + 1) % Number.MAX_SAFE_INTEGER);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const currentStop = useMemo(
    () =>
      deriveCurrentStop(currentSnapshot.today_stops, currentLocalMinutes()),
    // clockTick is intentionally a dependency so `currentLocalMinutes()` is
    // re-evaluated each minute; `deriveCurrentStop` itself is pure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSnapshot.today_stops, clockTick],
  );

  const todayUnplanned = currentSnapshot.today_unplanned;
  const blockers = currentSnapshot.blockers;
  const defaultLogDate =
    currentSnapshot.today.day_date ||
    currentSnapshot.today_stops[0]?.day_date ||
    todayLocalISODate();

  const [logOpen, setLogOpen] = useState(false);

  const stopVMs: StopVM[] = useMemo(() => {
    return currentSnapshot.today_stops.map((stop, index) => {
      const key = stop.stop_ref ?? `row-${index}`;
      const stopRef = stop.stop_ref;
      return {
        ...stop,
        key,
        effectiveStatus: effectiveStatus(stop),
        isPending: Boolean(stopRef && statusPending[stopRef]),
        isReadOnly: readOnly,
      };
    });
  }, [currentSnapshot.today_stops, readOnly, statusPending]);

  // Progress derived client-side: confirmed + skipped / total
  const { progressPct, doneCount, totalCount } = useMemo(() => {
    const total = stopVMs.length;
    if (total === 0) return { progressPct: 0, doneCount: 0, totalCount: 0 };
    const done = stopVMs.filter(
      (s) => s.effectiveStatus === "confirmed" || s.effectiveStatus === "skipped",
    ).length;
    return {
      progressPct: Math.round((done / total) * 100),
      doneCount: done,
      totalCount: total,
    };
  }, [stopVMs]);

  const nowKey = currentStop?.stop_ref ?? null;
  const nextKey = currentSnapshot.next_stop.stop_ref ?? null;

  /**
   * Build the Confirm/Skip/Reset/Navigate handlers for a single stop.
   *
   * Three callers need this exact surface: each TimelineRow, the mobile
   * HappeningNowCard, and the desktop-rail HappeningNowCard. Centralising the
   * closures here keeps mutation + telemetry semantics in one place and
   * removes the previous three-way duplication.
   */
  const buildStopActions = useCallback(
    (stop: StopVM) => {
      const stopRef = stop.stop_ref;
      const noop = () => {};
      if (!stopRef || readOnly) {
        return {
          onNavigate: () => {
            track({
              name: "ontrip_navigate_clicked",
              props: { trip_id: trip.id, stop_ref: stopRef ?? null },
            });
          },
          onConfirm: noop,
          onSkip: noop,
          onReset: noop,
        };
      }
      return {
        onNavigate: () => {
          track({
            name: "ontrip_navigate_clicked",
            props: { trip_id: trip.id, stop_ref: stopRef },
          });
        },
        onConfirm: () => {
          const next =
            stop.effectiveStatus === "confirmed" ? "planned" : "confirmed";
          track({
            name:
              next === "planned"
                ? "ontrip_stop_reverted"
                : "ontrip_stop_confirmed",
            props: { trip_id: trip.id, stop_ref: stopRef },
          });
          void setStopStatus(stopRef, next);
        },
        onSkip: () => {
          const next =
            stop.effectiveStatus === "skipped" ? "planned" : "skipped";
          track({
            name:
              next === "planned"
                ? "ontrip_stop_reverted"
                : "ontrip_stop_skipped",
            props: { trip_id: trip.id, stop_ref: stopRef },
          });
          void setStopStatus(stopRef, next);
        },
        onReset: () => {
          track({
            name: "ontrip_stop_reverted",
            props: { trip_id: trip.id, stop_ref: stopRef },
          });
          void setStopStatus(stopRef, "planned");
        },
      };
    },
    [readOnly, setStopStatus, trip.id],
  );

  const timelineRows = useMemo(() => {
    return stopVMs.map((stop) => {
      const stopRef = stop.stop_ref;
      const isNow = Boolean(stopRef && nowKey && stopRef === nowKey);
      const isNext = Boolean(stopRef && nextKey && stopRef === nextKey);
      return deriveStopVisualState({
        stop,
        isNow,
        isNext,
        blockers,
        actions: buildStopActions(stop),
      });
    });
  }, [blockers, buildStopActions, nextKey, nowKey, stopVMs]);

  const nowVM = useMemo(() => {
    const stopRef = currentStop?.stop_ref ?? null;
    if (!stopRef) return null;
    return stopVMs.find((s) => s.stop_ref === stopRef) ?? null;
  }, [currentStop?.stop_ref, stopVMs]);

  const unplannedVM = useMemo(
    () =>
      todayUnplanned.map((stop) => ({
        ...stop,
        isPending: Boolean(unplannedPendingIds[stop.event_id]),
      })),
    [todayUnplanned, unplannedPendingIds],
  );

  return (
    <section
      className="overflow-hidden rounded-[28px] border border-border-ontrip-strong bg-surface-ontrip shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_60px_-32px_rgba(58,42,31,0.28)]"
    >
      {/* ── Header: breadcrumb + progress + title ──────────────────────────── */}
      <OnTripHeader
        trip={trip}
        readOnly={readOnly}
        dayNumber={currentSnapshot.today.day_number}
        dayDate={currentSnapshot.today.day_date}
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

      {/* ── Body: single column on mobile, editorial two-column on desktop ─ */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-2">
        {/* Main column (left on desktop) */}
        <div className="lg:col-span-8">
          {/* Happening Now card — in-flow on mobile, moved to rail on desktop */}
          {nowVM ? (
            <div className="px-6 pb-2 sm:px-8 lg:hidden">
              <HappeningNowCard stop={nowVM} {...buildStopActions(nowVM)} />
            </div>
          ) : null}

          {/* Full-day timeline — constrained scroller only on mobile */}
          <div className="mt-6 max-h-[calc(100dvh-300px)] overflow-y-auto lg:mt-0 lg:max-h-none lg:overflow-visible">
            {timelineRows.length === 0 ? (
              <p className="px-6 text-sm text-ontrip-muted sm:px-8 lg:px-0">
                No planned stops for today. You can still log what happens below.
              </p>
            ) : (
              <DayTimeline rows={timelineRows} />
            )}

            {/* Along the way — always rendered; in-flow on both layouts */}
            <div className="mt-8 lg:mt-10">
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

            {/* Needs attention — mobile only; desktop renders in the rail */}
            {blockers.length > 0 ? (
              <div className="mt-6 pb-4 lg:hidden">
                <NeedsAttentionCard blockers={blockers} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Right rail — desktop only */}
        <aside className="hidden lg:col-span-4 lg:mt-0 lg:flex lg:flex-col lg:gap-5 lg:pb-2">
          {nowVM ? (
            <HappeningNowCard
              stop={nowVM}
              variant="compact"
              {...buildStopActions(nowVM)}
            />
          ) : null}

          {blockers.length > 0 ? (
            <NeedsAttentionCard blockers={blockers} variant="rail" />
          ) : null}
        </aside>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
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

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <Toast message={toastMessage} onDismiss={dismissFeedback} />

      {/* ── Log Stop button (floating) ──────────────────────────────────────
          Omitted entirely in read-only; execution affordances never render. */}
      {readOnly ? null : (
        <LogStopFAB
          disabled={isLoggingUnplanned}
          onClick={() => {
            track({ name: "ontrip_log_stop_opened", props: { trip_id: trip.id } });
            setLogOpen(true);
          }}
        />
      )}

      {/* ── Log Stop sheet / modal ─────────────────────────────────────────── */}
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

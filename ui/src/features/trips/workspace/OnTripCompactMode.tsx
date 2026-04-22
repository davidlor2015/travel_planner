import { useMemo, useState } from "react";

import type {
  Trip,
  TripExecutionStatus,
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
  TripOnTripUnplannedStop,
} from "../../../shared/api/trips";
import { Toast } from "../../../shared/ui/Toast";
import { useOnTripMutations } from "./useOnTripMutations";

type StopRow = TripOnTripStopSnapshot & { key: string };

const STATUS_OPTIONS: Array<{ id: TripExecutionStatus; label: string }> = [
  { id: "planned", label: "Planned" },
  { id: "confirmed", label: "Confirmed" },
  { id: "skipped", label: "Skipped" },
];

function effectiveStatus(stop: TripOnTripStopSnapshot): TripExecutionStatus {
  return stop.execution_status ?? stop.status ?? "planned";
}

function stopSubline(stop: TripOnTripStopSnapshot): string {
  const time = stop.time?.trim() || "time TBD";
  const place = stop.location?.trim() || "location TBD";
  return `${time} · ${place}`;
}

function mapsHrefForStop(stop: {
  location: string | null;
  title?: string | null;
}): string | null {
  const query = (stop.location || stop.title || "").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function todayLocalISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type StopRowProps = {
  stop: StopRow;
  isPending: boolean;
  onStatusChange: (stopRef: string, nextStatus: TripExecutionStatus) => void;
};

function StopRowView({ stop, isPending, onStatusChange }: StopRowProps) {
  const currentStatus = effectiveStatus(stop);
  const mapsHref = mapsHrefForStop(stop);
  const isSkipped = currentStatus === "skipped";

  return (
    <li
      className={`rounded-2xl border px-4 py-3 transition-colors ${
        isSkipped
          ? "border-[#E8DFD2] bg-[#F4EFE7]/60"
          : "border-[#EDE7DD] bg-[#FAF8F5]/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${
              isSkipped ? "text-[#8A7D6F] line-through" : "text-[#1C1108]"
            }`}
          >
            {stop.title ?? "Untitled stop"}
          </p>
          <p className="mt-0.5 text-xs text-[#6B5E52]">{stopSubline(stop)}</p>
        </div>
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex min-h-9 items-center rounded-full border border-[#1C1108] px-3 py-1 text-xs font-semibold text-[#1C1108] hover:bg-[#1C1108] hover:text-white transition-colors"
            aria-label={`Navigate to ${stop.title ?? "stop"}`}
          >
            Navigate
          </a>
        ) : null}
      </div>

      <div
        className="mt-3 -mx-1 flex gap-1 overflow-x-auto"
        role="group"
        aria-label="Update status"
      >
        {STATUS_OPTIONS.map((option) => {
          const isActive = currentStatus === option.id;
          const disabled = !stop.stop_ref || isPending;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => stop.stop_ref && onStatusChange(stop.stop_ref, option.id)}
              aria-pressed={isActive}
              className={`min-h-9 shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#1C1108] text-white"
                  : "border border-[#EDE7DD] bg-white text-[#6B5E52] hover:border-[#1C1108] hover:text-[#1C1108]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </li>
  );
}

type UnplannedRowProps = {
  stop: TripOnTripUnplannedStop;
  isPending: boolean;
  onRemove: (eventId: number) => void;
};

function UnplannedRow({ stop, isPending, onRemove }: UnplannedRowProps) {
  const mapsHref = mapsHrefForStop(stop);
  return (
    <li className="rounded-2xl border border-dashed border-[#CEBFAA] bg-[#FDF8EF] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#B58C4B]">
            Unplanned
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#1C1108]">{stop.title}</p>
          <p className="mt-0.5 text-xs text-[#6B5E52]">
            {(stop.time?.trim() || "time TBD") + " · " + (stop.location?.trim() || "location TBD")}
          </p>
          {stop.notes ? (
            <p className="mt-1 text-xs italic text-[#6B5E52]">{stop.notes}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded-full border border-[#1C1108] px-3 py-1 text-xs font-semibold text-[#1C1108] hover:bg-[#1C1108] hover:text-white transition-colors"
            >
              Navigate
            </a>
          ) : null}
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRemove(stop.event_id)}
            className="inline-flex min-h-9 items-center rounded-full border border-[#E8DFD2] bg-white px-3 py-1 text-xs font-medium text-[#6B5E52] hover:border-danger hover:text-danger transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label={`Remove ${stop.title}`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

type LogStopFormProps = {
  disabled: boolean;
  defaultDate: string;
  onSubmit: (payload: {
    day_date: string;
    title: string;
    time: string | null;
    location: string | null;
  }) => Promise<void>;
};

function LogStopForm({ disabled, defaultDate, onSubmit }: LogStopFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    await onSubmit({
      day_date: defaultDate,
      title: trimmedTitle,
      time: time.trim() || null,
      location: location.trim() || null,
    });
    setTitle("");
    setTime("");
    setLocation("");
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full min-h-10 rounded-full border border-dashed border-[#CEBFAA] bg-white px-4 py-2 text-sm font-semibold text-[#6B5E52] hover:border-[#1C1108] hover:text-[#1C1108] transition-colors"
      >
        + Log an unplanned stop
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-2xl border border-[#EDE7DD] bg-white px-3 py-3"
    >
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What happened? (required)"
        required
        autoFocus
        className="w-full rounded-lg border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          placeholder="Time (e.g. 16:30)"
          className="flex-1 rounded-lg border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
        />
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className="flex-1 rounded-lg border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setTitle("");
            setTime("");
            setLocation("");
          }}
          className="min-h-9 rounded-full border border-[#EDE7DD] bg-white px-3 py-1.5 text-sm font-medium text-[#6B5E52] hover:border-[#1C1108] hover:text-[#1C1108] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled || !title.trim()}
          className="min-h-9 rounded-full bg-[#1C1108] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#2B1B0F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {disabled ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function NextUpBanner({ nextStop }: { nextStop: TripOnTripStopSnapshot }) {
  if (!nextStop.title) return null;
  const mapsHref = mapsHrefForStop(nextStop);
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#1C1108] px-4 py-3 text-white">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#D7C7B0]">
          Next up
        </p>
        <p className="mt-0.5 text-sm font-semibold">{nextStop.title}</p>
        <p className="mt-0.5 text-xs text-[#D7C7B0]">{stopSubline(nextStop)}</p>
      </div>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex min-h-9 items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
        >
          Navigate
        </a>
      ) : null}
    </div>
  );
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

  // The component stays presentation-only: Toast renders whatever error the
  // hook currently exposes. Dismissing the toast dismisses the hook feedback.
  const toastMessage = feedback?.kind === "error" ? feedback.message : null;

  const currentSnapshot = viewSnapshot ?? snapshot;
  const todayStops: StopRow[] = useMemo(
    () =>
      currentSnapshot.today_stops.map((stop, index) => ({
        ...stop,
        key: stop.stop_ref ?? `row-${index}`,
      })),
    [currentSnapshot.today_stops],
  );
  const todayUnplanned = currentSnapshot.today_unplanned;
  const blockers = currentSnapshot.blockers;
  const defaultLogDate =
    currentSnapshot.today.day_date ||
    currentSnapshot.today_stops[0]?.day_date ||
    todayLocalISODate();

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_18px_55px_rgba(28,17,8,0.08)]">
      <div className="border-b border-[#EDE7DD] bg-[#FAF8F5]/80 px-5 py-4 sm:px-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
              On-Trip mode
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[#1C1108]">
              {trip.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onOpenActivityDrawer ? (
              <button
                type="button"
                onClick={onOpenActivityDrawer}
                aria-label={
                  activityUnreadCount > 0
                    ? `${activityUnreadCount} unread trip updates`
                    : "Open trip updates"
                }
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EDE7DD] bg-white text-[#6B5E52] transition-colors hover:border-[#1C1108] hover:text-[#1C1108]"
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
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#FEFCF9] bg-[#B86845]"
                  />
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenFullWorkspace}
              className="rounded-full border border-[#EDE7DD] bg-white px-3 py-1 text-xs font-medium text-[#6B5E52] hover:border-[#1C1108] hover:text-[#1C1108] transition-colors"
            >
              Full workspace
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4 sm:px-7">
        <NextUpBanner nextStop={currentSnapshot.next_stop} />

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
            Today
          </p>
          {todayStops.length === 0 ? (
            <p className="mt-2 text-sm text-[#6B5E52]">
              No planned stops for today. You can still log what happens below.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todayStops.map((stop) => (
                <StopRowView
                  key={stop.key}
                  stop={stop}
                  isPending={Boolean(stop.stop_ref && statusPending[stop.stop_ref])}
                  onStatusChange={setStopStatus}
                />
              ))}
            </ul>
          )}
        </div>

        {todayUnplanned.length > 0 ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
              Also today
            </p>
            <ul className="mt-2 space-y-2">
              {todayUnplanned.map((stop) => (
                <UnplannedRow
                  key={stop.event_id}
                  stop={stop}
                  isPending={Boolean(unplannedPendingIds[stop.event_id])}
                  onRemove={removeUnplannedStop}
                />
              ))}
            </ul>
          </div>
        ) : null}

        <LogStopForm
          disabled={isLoggingUnplanned}
          defaultDate={defaultLogDate}
          onSubmit={async (payload) => {
            await logUnplannedStop(payload);
          }}
        />
      </div>

      {blockers.length > 0 ? (
        <div className="border-t border-[#EDE7DD] px-5 py-4 sm:px-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
            Active blockers
          </p>
          <ul className="mt-2 space-y-2">
            {blockers.map((blocker) => (
              <li
                key={blocker.id}
                className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2"
              >
                <p className="text-xs font-semibold text-danger">{blocker.title}</p>
                <p className="mt-0.5 text-xs text-danger/90">{blocker.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Toast message={toastMessage} onDismiss={dismissFeedback} />
    </section>
  );
}

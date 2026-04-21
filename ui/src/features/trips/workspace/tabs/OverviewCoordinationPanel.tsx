import { motion } from "framer-motion";

import type { Trip } from "../../../../shared/api/trips";
import type { Itinerary } from "../../../../shared/api/ai";
import type { TripActivityItem } from "../../TripActivity";
import type {
  TripActionabilityModel,
  TripActionCommand,
} from "../deriveTripActionItems";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../types";
import {
  buildItineraryOpsSnapshot,
  buildTripReadinessSnapshot,
} from "../tripOverviewViewModel";

interface OverviewCoordinationPanelProps {
  trip: Trip;
  packingSummary: PackingSummary;
  budgetSummary: BudgetSummary;
  reservationSummary: ReservationSummary;
  currentItinerary: Itinerary | null;
  actionability: TripActionabilityModel;
  activities: TripActivityItem[];
  onOpenTab: (
    tab: "overview" | "bookings" | "budget" | "packing" | "members",
  ) => void;
  onOpenActivityDrawer: () => void;
  onActionCommand: (command: TripActionCommand) => void;
}

function relativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const timestamp = new Date(isoString).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

const ACTIVITY_TYPE_COLORS: Readonly<Record<string, string>> = {
  trip_created: "#6A7A43",
  member_joined: "#6A7A43",
  booking_confirmed: "#4D6B8A",
  itinerary_updated: "#B86845",
  note_added: "#C89A3C",
  packing_completed: "#7A5A8B",
  reminder_triggered: "#B86845",
};

function activityColor(type: string): string {
  return ACTIVITY_TYPE_COLORS[type] ?? "#B86845";
}

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return <span className="text-[#B5AA9E]">{children}</span>;
}

function SectionHeader({
  label,
  icon,
  onOpen,
}: {
  label: string;
  icon: React.ReactNode;
  onOpen?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <HeaderIcon>{icon}</HeaderIcon>
      <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
        {label}
      </span>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-[#B86845] transition-colors hover:text-[#9A5230] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
        >
          Open
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div className="mx-5 h-px bg-[#EDE7DD]" />;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#EDE8E0]">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

function severityStyles(
  severity: TripActionabilityModel["rankedOperationalActions"][number]["severity"],
): string {
  if (severity === "blocker") {
    return "border-l-[3px] border-danger bg-danger/[0.06]";
  }
  if (severity === "watch") {
    return "border-l-[3px] border-amber bg-amber/[0.06]";
  }
  return "border-l-[3px] border-[#D2B49A] bg-[#FAF8F5]";
}

function AttentionItemRow({
  item,
  onAction,
}: {
  item: TripActionabilityModel["rankedOperationalActions"][number];
  onAction: () => void;
}) {
  return (
    <div
      className={`rounded-r-lg px-3 py-2.5 pl-3 ${severityStyles(item.severity)}`}
    >
      <p className="text-[12px] font-semibold leading-snug text-[#1C1108]">
        {item.title}
      </p>
      {item.detail ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5E52]">
          {item.detail}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onAction}
        className="mt-2 text-left text-[11px] font-semibold text-[#B86845] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

export function OverviewCoordinationPanel({
  trip,
  packingSummary,
  budgetSummary,
  reservationSummary,
  currentItinerary,
  actionability,
  activities,
  onOpenTab,
  onOpenActivityDrawer,
  onActionCommand,
}: OverviewCoordinationPanelProps) {
  const summariesLoaded =
    !packingSummary.loading &&
    !budgetSummary.loading &&
    !reservationSummary.loading;

  const readiness = buildTripReadinessSnapshot(
    trip,
    packingSummary,
    budgetSummary,
    reservationSummary,
    summariesLoaded,
    currentItinerary,
  );
  const itineraryOps = buildItineraryOpsSnapshot(currentItinerary);

  const packingPct =
    typeof packingSummary.progressPct === "number"
      ? packingSummary.progressPct
      : packingSummary.total > 0
        ? Math.round((packingSummary.checked / packingSummary.total) * 100)
        : 0;

  const budgetLimit = budgetSummary.limit ?? 0;
  const budgetSpent = budgetSummary.totalSpent ?? 0;
  const budgetPct =
    budgetLimit > 0 ? Math.round((budgetSpent / budgetLimit) * 100) : 0;
  const budgetRemaining =
    typeof budgetSummary.remaining === "number"
      ? budgetSummary.remaining
      : budgetLimit - budgetSpent;

  const bookingTotal = reservationSummary.total ?? 0;
  const bookingUpcoming = reservationSummary.upcoming ?? 0;
  const bookingPending = Math.max(0, bookingTotal - bookingUpcoming);
  const isGroupTrip = trip.members.length > 1 || trip.pending_invites.length > 0;

  const ownerCount = trip.members.filter(
    (member) => member.role === "owner",
  ).length;
  const joinedCount = trip.members.length;
  const pendingInvitesCount = trip.pending_invites.length;
  const visibleActivity = activities.slice(0, 4);
  const unhandledStopCount = Math.max(
    0,
    itineraryOps.totalStops - itineraryOps.stopsWithHandledBy,
  );
  const handlerPreview = itineraryOps.handlerCounts.slice(0, 3);
  const primaryAction = actionability.primaryAction;

  return (
    <aside
      className="overflow-hidden rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9]"
      aria-label="Trip coordination and readiness"
    >
      <div className="border-b border-[#EDE7DD] bg-[#FAF8F5]/80 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
          Trip readiness
        </p>
        {readiness.score != null && readiness.scoreLabel ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums text-[#1C1108]">
              {readiness.score}
            </span>
            <span className="text-[12px] font-medium text-[#6B5E52]">
              {readiness.scoreLabel}
            </span>
            {readiness.unknownState === "partial" ? (
              <span className="text-[11px] text-[#A39688]">
                Partial coverage
              </span>
            ) : null}
          </div>
        ) : summariesLoaded ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[#6B5E52]">
            Readiness is unknown. Add itinerary status, packing, budget, or
            bookings so it can be measured from trip data.
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-[#A39688]">
            Loading workspace signals…
          </p>
        )}
      </div>

      <div className="px-5 pt-4 pb-3">
        <div className="mb-2 flex items-center gap-2">
          <HeaderIcon>
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="M10 3v4M10 13v4M3 10h4M13 10h4"
                strokeLinecap="round"
              />
            </svg>
          </HeaderIcon>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
            What needs attention
          </span>
        </div>
        {actionability.systemFailures.length === 0 &&
        actionability.primaryAction == null ? (
          <p className="text-[12px] leading-relaxed text-[#6B5E52]">
            Nothing urgent surfaced from trip data. Keep the shared itinerary
            and logistics current.
          </p>
        ) : (
          <ul className="space-y-2">
            {actionability.systemFailures.map((item) => (
              <li key={item.id}>
                <AttentionItemRow
                  item={item}
                  onAction={() => onActionCommand(item.command)}
                />
              </li>
            ))}
            {primaryAction ? (
              <li key={primaryAction.id}>
                <AttentionItemRow
                  item={primaryAction}
                  onAction={() => onActionCommand(primaryAction.command)}
                />
              </li>
            ) : null}
            {actionability.secondaryActions.map((item) => (
              <li key={item.id}>
                <AttentionItemRow
                  item={item}
                  onAction={() => onActionCommand(item.command)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Divider />

      <div className="px-5 pt-5 pb-4">
        <SectionHeader
          label="Itinerary ops"
          onOpen={() => onOpenTab("overview")}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="M5 4h10M5 10h10M5 16h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        {!itineraryOps.hasItinerary ? (
          <p className="text-[12px] text-[#B5AA9E]">
            No itinerary source yet
          </p>
        ) : itineraryOps.totalStops === 0 ? (
          <p className="text-[12px] text-[#B5AA9E]">
            Itinerary has no stops yet
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="font-display text-[20px] font-semibold leading-none text-espresso">
                  {itineraryOps.totalStops}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39688]">
                  Stops
                </p>
              </div>
              <div>
                <p className="font-display text-[20px] font-semibold leading-none text-[#3F6212]">
                  {itineraryOps.confirmedStops}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39688]">
                  Confirmed
                </p>
              </div>
              <div>
                <p className="font-display text-[20px] font-semibold leading-none text-[#B86845]">
                  {itineraryOps.plannedStops}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39688]">
                  Planned
                </p>
              </div>
            </div>
            {isGroupTrip ? (
              itineraryOps.ownershipSignalsPresent ? (
                <div className="rounded-xl border border-[#EDE7DD] bg-[#FAF8F5]/70 px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-espresso">
                    {unhandledStopCount === 0
                      ? "Every handled stop has an owner"
                      : `${unhandledStopCount} stop${unhandledStopCount === 1 ? "" : "s"} without a handler`}
                  </p>
                  {handlerPreview.length > 0 ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-[#6B5E52]">
                      {handlerPreview
                        .map(({ name, count }) => `${name} ${count}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[12px] text-[#B5AA9E]">
                  Ownership signals have not been set yet.
                </p>
              )
            ) : null}
          </div>
        )}
      </div>

      <Divider />

      <div className="px-5 pt-5 pb-4">
        <SectionHeader
          label="Packing"
          onOpen={() => onOpenTab("packing")}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="M8 7V5a4 4 0 0 1 8 0v2M4 7h12l-1 12H5L4 7Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        {packingSummary.loading ? (
          <p className="text-[12px] text-[#A39688]">Loading…</p>
        ) : packingSummary.total > 0 ? (
          <>
            <div className="mb-2 flex items-end justify-between gap-2">
              <span className="font-display text-[26px] font-semibold leading-none text-espresso">
                {packingPct}%
              </span>
              <span className="text-[11px] text-[#A39688]">
                {packingSummary.checked}/{packingSummary.total} packed
              </span>
            </div>
            <ProgressBar
              value={packingPct}
              color={packingPct >= 80 ? "#3F6212" : "#B86845"}
            />
          </>
        ) : (
          <p className="text-[12px] text-[#B5AA9E]">No packing list yet</p>
        )}
      </div>

      <Divider />

      <div className="px-5 py-4">
        <SectionHeader
          label="Budget"
          onOpen={() => onOpenTab("budget")}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="16" height="11" rx="2" />
              <path d="M14 10.5h2" strokeLinecap="round" />
            </svg>
          }
        />
        {budgetSummary.loading ? (
          <p className="text-[12px] text-[#A39688]">Loading…</p>
        ) : budgetLimit > 0 ? (
          <>
            <div className="mb-1 flex items-end justify-between gap-2">
              <span className="font-display text-[16px] font-semibold leading-none text-espresso">
                ${budgetSpent.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#A39688]">
                of ${budgetLimit.toLocaleString()}
              </span>
            </div>
            <ProgressBar
              value={budgetPct}
              color={budgetPct > 90 ? "#B86845" : "#3F6212"}
            />
            <p
              className="mt-1.5 text-[12px] font-medium"
              style={{ color: budgetRemaining >= 0 ? "#3F6212" : "#B86845" }}
            >
              ${Math.abs(budgetRemaining).toLocaleString()}{" "}
              {budgetRemaining >= 0 ? "remaining" : "over budget"}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-[#B5AA9E]">No group budget set</p>
        )}
      </div>

      <Divider />

      <div className="px-5 py-4">
        <SectionHeader
          label="People & chat"
          onOpen={() => onOpenTab("members")}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 19a6 6 0 0 1 12 0M14.5 8a3.5 3.5 0 0 1 0 7M17 19a5 5 0 0 0-2.5-4.33"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <p className="text-[13px] leading-relaxed text-espresso">
          <span className="font-semibold">{joinedCount}</span> travelers
          <span className="text-[#A39688]"> · </span>
          {pendingInvitesCount} pending invite
          {pendingInvitesCount === 1 ? "" : "s"}
          <span className="text-[#A39688]"> · </span>
          {ownerCount} owner
          {ownerCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2 text-[12px] text-[#6B5E52]">
          Trip chat:{" "}
          <span className="font-medium text-[#1C1108]">
            {trip.members.length > 1 ? "Available" : "Needs 2+ travelers"}
          </span>
        </p>
      </div>

      <Divider />

      <div className="px-5 py-4">
        <SectionHeader
          label="Bookings"
          onOpen={() => onOpenTab("bookings")}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="3"
                width="16"
                height="15"
                rx="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 1v4M14 1v4M2 7h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        {reservationSummary.loading ? (
          <p className="text-[12px] text-[#A39688]">Loading…</p>
        ) : bookingTotal === 0 ? (
          <p className="text-[12px] text-[#B5AA9E]">No bookings logged</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-espresso">
              <span className="font-medium text-[#3F6212]">
                {bookingUpcoming} upcoming
              </span>
              <span className="text-[#C89A3C]">{bookingPending} other</span>
            </div>
          </div>
        )}
      </div>

      <Divider />

      <div className="px-5 py-4 pb-5">
        <SectionHeader
          label="Recent activity"
          onOpen={onOpenActivityDrawer}
          icon={
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="8" />
              <path
                d="M10 6v4l2.5 2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        {visibleActivity.length === 0 ? (
          <p className="text-[12px] text-[#B5AA9E]">
            No activity yet — edits, invites, and bookings show up here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {visibleActivity.map((activity) => {
              const color = activityColor(activity.type);
              const label = activity.title[0]?.toUpperCase() ?? "W";
              const time = relativeTime(activity.occurredAt);

              return (
                <div key={activity.id} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                    style={{
                      backgroundColor: color,
                      fontSize: "7px",
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[12px] leading-[1.4] text-espresso">
                      {activity.title}
                    </p>
                    {activity.detail ? (
                      <p className="truncate text-[11px] text-[#A39688]">
                        {activity.detail}
                      </p>
                    ) : null}
                  </div>
                  {time ? (
                    <span className="shrink-0 text-[9px] text-[#B5AA9E]">
                      {time}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

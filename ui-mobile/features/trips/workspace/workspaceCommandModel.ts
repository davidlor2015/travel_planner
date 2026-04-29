// Path: ui-mobile/features/trips/workspace/workspaceCommandModel.ts
// Summary: Implements workspaceCommandModel module logic.

import type { DayPlan, Itinerary, ItineraryItem } from "@/features/ai/api";
import { formatTripStopTime } from "@/features/trips/stopTime";
import type { TripOnTripSnapshot, TripOnTripStopSnapshot } from "../types";

import type {
  TripSummaryViewModel,
  TripWorkspaceCollaborationViewModel,
  TripWorkspaceViewModel,
  WorkspacePillVariant,
} from "./adapters";
import type { WorkspaceTab } from "./WorkspaceTabBar";

export type WorkspaceQuickAction = {
  key: WorkspaceTab;
  label: string;
  summary: string;
  detail: string;
  tone: "neutral" | "warning" | "success";
};

export type WorkspaceAttentionItem = {
  label: string;
  detail: string;
  variant: WorkspacePillVariant;
};

export type WorkspaceItineraryPreview = {
  dayIndex: number;
  day: DayPlan;
  title: string;
  subtitle: string;
  primaryStop: ItineraryItem | null;
  secondaryStops: ItineraryItem[];
  totalStops: number;
};

export type WorkspaceCommandModel = {
  todayTitle: string;
  todayBody: string;
  todayMeta: string | null;
  nextActionTitle: string;
  nextActionBody: string;
  nextActionMeta: string | null;
  readinessTitle: string;
  readinessBody: string;
  attentionItems: WorkspaceAttentionItem[];
  quickActions: WorkspaceQuickAction[];
  itineraryPreview: WorkspaceItineraryPreview | null;
};

export type WorkspaceItineraryState = {
  itinerary: Itinerary | null;
  isMissing: boolean;
  isLoading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isStreaming: boolean;
};

function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function stopLabel(stop: ItineraryItem | TripOnTripStopSnapshot | null | undefined): string | null {
  const title = stop?.title?.trim();
  if (!title) return null;
  const parts = [stop?.time ? formatTripStopTime(stop.time) : null, title].filter(Boolean);
  return parts.join(" · ");
}

function isOpenItineraryStop(stop: ItineraryItem): boolean {
  const status = stop.status ?? "planned";
  return status !== "confirmed" && status !== "skipped";
}

export function selectRelevantItineraryDay(args: {
  itinerary: Itinerary | null;
  trip: TripWorkspaceViewModel;
  onTripSnapshot: TripOnTripSnapshot | null;
  now?: Date;
}): { day: DayPlan; dayIndex: number } | null {
  const { itinerary, trip, onTripSnapshot, now = new Date() } = args;
  const days = itinerary?.days ?? [];
  if (days.length === 0) return null;

  if (trip.status === "active") {
    const snapshotDay = onTripSnapshot?.today.day_number;
    if (typeof snapshotDay === "number") {
      const index = days.findIndex((day) => day.day_number === snapshotDay);
      if (index >= 0) return { day: days[index]!, dayIndex: index };
    }

    const today = todayISO(now);
    const dateIndex = days.findIndex((day) => day.date === today);
    if (dateIndex >= 0) return { day: days[dateIndex]!, dayIndex: dateIndex };

    return { day: days[0]!, dayIndex: 0 };
  }

  if (trip.status === "past") {
    const dayIndex = days.length - 1;
    return { day: days[dayIndex]!, dayIndex };
  }

  const today = todayISO(now);
  const nextIndex = days.findIndex((day) => day.date && day.date >= today);
  const dayIndex = nextIndex >= 0 ? nextIndex : 0;
  return { day: days[dayIndex]!, dayIndex };
}

export function buildItineraryPreview(args: {
  itinerary: Itinerary | null;
  trip: TripWorkspaceViewModel;
  onTripSnapshot: TripOnTripSnapshot | null;
}): WorkspaceItineraryPreview | null {
  const selection = selectRelevantItineraryDay(args);
  if (!selection) return null;

  const { day, dayIndex } = selection;
  const title = day.day_title?.trim() || `Day ${day.day_number}`;
  const dateLabel = formatDateLabel(day.date);
  const totalStops = day.items.length;
  const primaryStop =
    args.trip.status === "past"
      ? day.items[day.items.length - 1] ?? null
      : day.items.find(isOpenItineraryStop) ?? day.items[0] ?? null;
  const secondaryStops = day.items
    .filter((item) => item !== primaryStop)
    .slice(0, 2);
  const subtitle = [dateLabel, plural(totalStops, "stop")].filter(Boolean).join(" · ");

  return { dayIndex, day, title, subtitle, primaryStop, secondaryStops, totalStops };
}

export function buildQuickActions(args: {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
}): WorkspaceQuickAction[] {
  const { trip, summary } = args;
  return [
    {
      key: "bookings",
      label: "Bookings",
      summary: summary ? plural(summary.reservationCount, "booking") : "Open",
      detail: summary?.reservationUpcoming
        ? `${summary.reservationUpcoming} upcoming`
        : "Reservations",
      tone: "neutral",
    },
    {
      key: "budget",
      label: "Budget",
      summary: summary ? `${formatMoney(summary.budgetSpent)} logged` : "Open",
      detail: summary?.isOverBudget
        ? "Over limit"
        : summary?.budgetLimit != null
          ? `${formatMoney(summary.budgetLimit)} limit`
          : "Spending",
      tone: summary?.isOverBudget ? "warning" : "neutral",
    },
    {
      key: "packing",
      label: "Packing",
      summary: summary ? `${summary.packingChecked} packed` : "Open",
      detail: summary ? `${summary.packingTotal} total` : "Checklist",
      tone:
        summary && summary.packingTotal > 0 && summary.packingChecked >= summary.packingTotal
          ? "success"
          : "neutral",
    },
    {
      key: "members",
      label: "Travelers",
      summary: plural(trip.memberCount, "traveler"),
      detail: trip.isOwner ? "Invite and readiness" : "Group readiness",
      tone: "neutral",
    },
  ];
}

export function buildAttentionItems(args: {
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel | null;
}): WorkspaceAttentionItem[] {
  const { summary, collaboration } = args;
  const items: WorkspaceAttentionItem[] = [];

  if (summary?.isOverBudget) {
    items.push({
      label: "Budget",
      detail: "Spending is over the saved limit.",
      variant: "warning",
    });
  }

  if (summary && summary.packingTotal > 0 && summary.packingChecked < summary.packingTotal) {
    items.push({
      label: "Packing",
      detail: `${summary.packingTotal - summary.packingChecked} item${summary.packingTotal - summary.packingChecked === 1 ? "" : "s"} left to pack.`,
      variant: "warning",
    });
  }

  const needsAttention = collaboration?.members.filter(
    (member) => member.readinessVariant === "warning" || member.readinessVariant === "error",
  ) ?? [];
  for (const member of needsAttention.slice(0, 2)) {
    items.push({
      label: member.isCurrentUser ? "Your readiness" : member.email,
      detail: member.readinessDetail,
      variant: member.readinessVariant,
    });
  }

  return items.slice(0, 4);
}

export function buildWorkspaceCommandModel(args: {
  trip: TripWorkspaceViewModel;
  summary: TripSummaryViewModel | null;
  collaboration: TripWorkspaceCollaborationViewModel | null;
  onTripSnapshot: TripOnTripSnapshot | null;
  itineraryState: WorkspaceItineraryState;
}): WorkspaceCommandModel {
  const { trip, summary, collaboration, onTripSnapshot, itineraryState } = args;
  const preview = buildItineraryPreview({
    itinerary: itineraryState.itinerary,
    trip,
    onTripSnapshot,
  });
  const activeStops = onTripSnapshot?.today_stops.filter((stop) => stop.title?.trim()) ?? [];
  const activeNextStop = stopLabel(onTripSnapshot?.next_stop);
  const activeTodayDate = formatDateLabel(onTripSnapshot?.today.day_date);

  const todayTitle =
    trip.status === "active"
      ? onTripSnapshot?.today.day_number
        ? `Today · Day ${onTripSnapshot.today.day_number}`
        : "Today"
      : trip.status === "upcoming"
        ? "Before you go"
        : "Trip recap";
  const todayBody =
    trip.status === "active"
      ? activeStops.length > 0
        ? `${plural(activeStops.length, "planned stop")} on today's timeline.`
        : "No resolved stops are planned for today."
      : trip.status === "upcoming"
        ? preview
          ? `${preview.title} is the next saved itinerary day.`
          : "Set up the plan, bookings, budget, and packing before departure."
        : preview
          ? `${preview.title} is the latest saved itinerary day.`
          : "Review past trip details and saved logistics.";

  const nextActionTitle =
    itineraryState.isStreaming
      ? "AI is building the plan"
      : itineraryState.isSaving
        ? "Saving itinerary"
        : itineraryState.isDirty
          ? "Publish itinerary changes"
          : itineraryState.isMissing
            ? "Generate a trip plan"
            : trip.status === "active" && activeNextStop
              ? "Next stop"
              : preview?.primaryStop
                ? trip.status === "past"
                  ? "Recent stop"
                  : "Next planned stop"
                : "Review the workspace";
  const nextActionBody =
    itineraryState.isStreaming
      ? "Keep this screen open or cancel generation if the draft is no longer needed."
      : itineraryState.isSaving
        ? "Writing the latest itinerary to the shared trip."
        : itineraryState.isDirty
          ? "Your edits are local until you publish them."
          : itineraryState.isMissing
            ? "Create an AI itinerary draft from the saved trip details."
            : trip.status === "active" && activeNextStop
              ? activeNextStop
              : stopLabel(preview?.primaryStop) ??
                "Open the relevant section when you need to adjust trip details.";

  const attentionItems = buildAttentionItems({ summary, collaboration });
  const readinessTitle =
    attentionItems.length > 0 ? `${plural(attentionItems.length, "thing")} to check` : "Readiness looks calm";
  const readinessBody =
    attentionItems.length > 0
      ? "Resolve these before relying on the plan in motion."
      : summary?.readinessLabel ?? "Open logistics when you want to add more trip details.";

  return {
    todayTitle,
    todayBody,
    todayMeta: trip.status === "active" ? activeTodayDate : trip.dateRange,
    nextActionTitle,
    nextActionBody,
    nextActionMeta: preview?.subtitle ?? null,
    readinessTitle,
    readinessBody,
    attentionItems,
    quickActions: buildQuickActions({ trip, summary }),
    itineraryPreview: preview,
  };
}

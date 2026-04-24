import type { TripResponse, TripSummary } from "../types";

export type TripStatus = "upcoming" | "active" | "past";

export type TripWorkspaceViewModel = {
  id: number;
  title: string;
  destination: string;
  dateRange: string;
  durationDays: number;
  status: TripStatus;
  statusLabel: string;
  memberCount: number;
  isOwner: boolean;
  members: Array<{ userId: number; email: string; role: string }>;
};

export type TripSummaryViewModel = {
  packingProgress: number;
  packingTotal: number;
  packingChecked: number;
  budgetLimit: number | null;
  budgetSpent: number;
  budgetRemaining: number | null;
  isOverBudget: boolean;
  reservationCount: number;
  reservationUpcoming: number;
  readinessLabel: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function getTripStatus(startDate: string, endDate: string): TripStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "active";
}

function tripStatusLabel(status: TripStatus): string {
  if (status === "active") return "In Progress";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

export function toTripWorkspaceViewModel(
  trip: TripResponse,
  currentUserEmail: string,
): TripWorkspaceViewModel {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const durationDays =
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? 0
      : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dateRange: `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`,
    durationDays,
    status: getTripStatus(trip.start_date, trip.end_date),
    statusLabel: tripStatusLabel(getTripStatus(trip.start_date, trip.end_date)),
    memberCount: trip.member_count,
    isOwner: trip.members.some(
      (m) => m.email.toLowerCase() === currentUserEmail.toLowerCase() && m.role === "owner",
    ),
    members: trip.members.map((m) => ({ userId: m.user_id, email: m.email, role: m.role })),
  };
}

export function toTripSummaryViewModel(summary: TripSummary): TripSummaryViewModel {
  const readinessLabel =
    summary.reservation_count > 0 ||
    summary.packing_total > 0 ||
    summary.budget_expense_count > 0
      ? "Operational details in progress"
      : "Add logistics to make this trip usable on mobile";
  return {
    packingProgress: summary.packing_progress_pct,
    packingTotal: summary.packing_total,
    packingChecked: summary.packing_checked,
    budgetLimit: summary.budget_limit,
    budgetSpent: summary.budget_total_spent,
    budgetRemaining: summary.budget_remaining,
    isOverBudget: summary.budget_is_over,
    reservationCount: summary.reservation_count,
    reservationUpcoming: summary.reservation_upcoming_count,
    readinessLabel,
  };
}

import type {
  TripMemberReadiness,
  TripResponse,
  TripSummary,
} from "../types";

export type TripStatus = "upcoming" | "active" | "past";
export type WorkspacePillVariant = "default" | "success" | "warning" | "error" | "info";

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
};

export type TripWorkspaceMemberViewModel = {
  userId: number;
  email: string;
  roleLabel: string;
  isCurrentUser: boolean;
  readinessLabel: string;
  readinessVariant: WorkspacePillVariant;
  readinessDetail: string;
};

export type TripWorkspacePendingInviteViewModel = {
  id: number;
  email: string;
  statusLabel: string;
  expiresAtLabel: string;
};

export type TripWorkspaceCollaborationViewModel = {
  canInvite: boolean;
  groupDescription: string;
  members: TripWorkspaceMemberViewModel[];
  pendingInvites: TripWorkspacePendingInviteViewModel[];
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

function roleLabel(role: string): string {
  return role === "owner" ? "Owner" : "Member";
}

function statusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
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
  };
}

export function toTripWorkspaceCollaborationViewModel(args: {
  trip: TripResponse;
  currentUserEmail: string;
  readiness: TripMemberReadiness | null;
  readinessLoading: boolean;
}): TripWorkspaceCollaborationViewModel {
  const { trip, currentUserEmail, readiness, readinessLoading } = args;
  const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase();
  const readinessByUserId = new Map(
    (readiness?.members ?? []).map((member) => [member.user_id, member]),
  );
  const canInvite = trip.members.some(
    (member) =>
      member.email.trim().toLowerCase() === normalizedCurrentUserEmail && member.role === "owner",
  );

  return {
    canInvite,
    groupDescription: canInvite
      ? "See who is ready, track pending invites, and add travelers without leaving mobile."
      : "See who is in this trip and how ready the group looks from the workspace.",
    members: trip.members.map((member) => {
      const readinessItem = readinessByUserId.get(member.user_id);
      const isCurrentUser =
        member.email.trim().toLowerCase() === normalizedCurrentUserEmail;

      if (!readinessItem) {
        return {
          userId: member.user_id,
          email: member.email,
          roleLabel: roleLabel(member.role),
          isCurrentUser,
          readinessLabel: readinessLoading ? "Checking readiness…" : "Readiness unavailable",
          readinessVariant: "default",
          readinessDetail: readinessLoading
            ? "Syncing the latest planning state for this traveler."
            : "Readiness could not be loaded for this traveler.",
        };
      }

      const readinessLabel =
        readinessItem.status === "ready"
          ? "Ready"
          : readinessItem.status === "needs_attention"
            ? `${readinessItem.blocker_count} blocker${readinessItem.blocker_count === 1 ? "" : "s"}`
            : "Readiness unknown";
      const readinessVariant: WorkspacePillVariant =
        readinessItem.status === "ready"
          ? "success"
          : readinessItem.status === "needs_attention"
            ? "warning"
            : "default";
      const readinessDetail =
        readinessItem.status === "ready"
          ? readinessItem.readiness_score != null
            ? `Readiness score ${readinessItem.readiness_score}%`
            : "No open blockers."
          : readinessItem.status === "needs_attention"
            ? readinessItem.blocker_count > 0
              ? `${readinessItem.blocker_count} itinerary blocker${readinessItem.blocker_count === 1 ? "" : "s"} need attention.`
              : readinessItem.readiness_score != null
                ? `Readiness score ${readinessItem.readiness_score}%`
                : "Operational details still need work."
            : "Not enough trip prep data yet.";

      return {
        userId: member.user_id,
        email: member.email,
        roleLabel: roleLabel(member.role),
        isCurrentUser,
        readinessLabel,
        readinessVariant,
        readinessDetail,
      };
    }),
    pendingInvites: trip.pending_invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      statusLabel: statusLabel(invite.status),
      expiresAtLabel: formatDate(invite.expires_at),
    })),
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

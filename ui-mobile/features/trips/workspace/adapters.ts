// Path: ui-mobile/features/trips/workspace/adapters.ts
// Summary: Implements adapters module logic.

import { getTripStatus } from "../adapters";
import type {
  TripMemberReadiness,
  TripResponse,
  TripSummary,
} from "../types";
import {
  getCurrentTripPermissions,
  getTripRoleLabel,
} from "./helpers/collaborationGate";

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
  members: { email: string }[];
  isOwner: boolean;
  canEdit: boolean;
  isReadOnly: boolean;
  currentUserRoleLabel: string;
};

export type TripWorkspaceMemberViewModel = {
  userId: number;
  email: string;
  displayLabel: string;
  emailSecondary: string | null;
  roleLabel: string;
  rolePillLabel: "Owner" | "Can edit" | "View only";
  supportingText: string;
  isCurrentUser: boolean;
  readinessLabel: string;
  readinessVariant: WorkspacePillVariant;
  readinessDetail: string;
};

export type TripWorkspacePendingInviteViewModel = {
  id: number;
  email: string;
  displayLabel: string;
  emailSecondary: string | null;
  rolePillLabel: "Can edit";
  supportingText: string;
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

function tripStatusLabel(status: TripStatus): string {
  if (status === "active") return "In Progress";
  if (status === "upcoming") return "Upcoming";
  return "Completed";
}

function inviteStatusLabel(status: string): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  if (status === "expired") return "Expired";
  return "Invite sent";
}

export function toTripWorkspaceViewModel(
  trip: TripResponse,
  currentUserEmail: string,
  currentUserId?: number | null,
): TripWorkspaceViewModel {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const permissions = getCurrentTripPermissions({
    trip,
    currentUserEmail,
    currentUserId,
  });
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
    members: trip.members.map((member) => ({ email: member.email })),
    isOwner: permissions.isOwner,
    canEdit: permissions.canEdit,
    isReadOnly: permissions.isReadOnly,
    currentUserRoleLabel: permissions.roleLabel,
  };
}

export function toTripWorkspaceCollaborationViewModel(args: {
  trip: TripResponse;
  currentUserEmail: string;
  currentUserDisplayName?: string | null;
  readiness: TripMemberReadiness | null;
  readinessLoading: boolean;
}): TripWorkspaceCollaborationViewModel {
  const { trip, currentUserEmail, currentUserDisplayName, readiness, readinessLoading } = args;
  const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase();
  const readinessByUserId = new Map(
    (readiness?.members ?? []).map((member) => [member.user_id, member]),
  );
  const canInvite = trip.members.some(
    (member) =>
      member.email.trim().toLowerCase() === normalizedCurrentUserEmail && member.role === "owner",
  );
  const isSoloTrip = trip.member_count <= 1;

  return {
    canInvite,
    groupDescription: isSoloTrip
      ? "Planning solo for now. Invite travel companions when you want to coordinate this trip with others."
      : canInvite
        ? "Track readiness, manage invites, and add travelers to the group."
        : "See who's joined and how ready the group looks from here.",
    members: trip.members.map((member) => {
      const readinessItem = readinessByUserId.get(member.user_id);
      const isCurrentUser =
        member.email.trim().toLowerCase() === normalizedCurrentUserEmail;
      const hasJoined = isJoinedStatus(member.status);
      const roleLabel = getTripRoleLabel(member.role, member.status);
      const displayLabel = resolveTravelerDisplayLabel({
        member,
        hasJoined,
        isCurrentUser,
        currentUserDisplayName,
      });
      const rolePillLabel = hasJoined ? toRolePillLabel(roleLabel, member.role) : "Can edit";
      const supportingText = hasJoined
        ? rolePillLabel === "Owner"
          ? "Can manage this trip and invite others."
          : rolePillLabel === "Can edit"
            ? "Can edit itinerary, packing, budget, and reservations."
            : "Can view the shared trip plan."
        : "Invite pending · Resend";

      if (!readinessItem) {
        return {
          userId: member.user_id,
          email: member.email,
          displayLabel,
          emailSecondary: member.email || null,
          roleLabel,
          rolePillLabel,
          supportingText,
          isCurrentUser,
          readinessLabel: readinessLoading ? "Checking…" : "Unavailable",
          readinessVariant: "default",
          readinessDetail: readinessLoading
            ? "Still syncing — check back in a moment."
            : "We couldn't load readiness for this traveler right now.",
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
          ? "You're on track — no open blockers."
          : readinessItem.status === "needs_attention"
            ? readinessItem.blocker_count > 0
              ? `${readinessItem.blocker_count} thing${readinessItem.blocker_count === 1 ? "" : "s"} still need attention before this trip is ready.`
              : "Still lining things up — a few details need work."
            : "Ready when you are — waiting on a bit more prep data.";

      return {
        userId: member.user_id,
        email: member.email,
        displayLabel,
        emailSecondary: member.email || null,
        roleLabel,
        rolePillLabel,
        supportingText,
        isCurrentUser,
        readinessLabel,
        readinessVariant,
        readinessDetail,
      };
    }),
    pendingInvites: trip.pending_invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      displayLabel: "Invited traveler",
      emailSecondary: invite.email || null,
      rolePillLabel: "Can edit",
      supportingText: "Invite pending · Resend",
      statusLabel: inviteStatusLabel(invite.status),
      expiresAtLabel: formatDate(invite.expires_at),
    })),
  };
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0]!.toUpperCase() + value.slice(1);
}

function displayNameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  if (!local) return null;
  return capitalize(local);
}

function isJoinedStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "" || normalized === "active" || normalized === "accepted" || normalized === "joined";
}

function toRolePillLabel(
  roleLabel: string,
  rawRole: string | null | undefined,
): "Owner" | "Can edit" | "View only" {
  if (roleLabel === "Owner") return "Owner";
  if (roleLabel === "Can edit") return "Can edit";
  if (roleLabel === "View only") return "View only";

  const normalizedRole = (rawRole ?? "").trim().toLowerCase();
  if (normalizedRole === "owner") return "Owner";
  if (normalizedRole === "viewer") return "View only";
  return "Can edit";
}

function resolveTravelerDisplayLabel(args: {
  member: TripResponse["members"][number];
  hasJoined: boolean;
  isCurrentUser: boolean;
  currentUserDisplayName?: string | null;
}): string {
  const { member, hasJoined, isCurrentUser, currentUserDisplayName } = args;
  const memberDisplayName = asText(member.display_name) ?? asText(member.name);
  const currentUserName = isCurrentUser ? asText(currentUserDisplayName) : null;
  const displayName = memberDisplayName ?? currentUserName;
  if (displayName) {
    return displayName;
  }

  if (hasJoined) {
    const emailName = displayNameFromEmail(asText(member.email));
    if (emailName) return emailName;
  }

  if (!hasJoined) {
    return "Invited traveler";
  }

  return "Traveler";
}

export function toTripSummaryViewModel(summary: TripSummary): TripSummaryViewModel {
  const readinessLabel =
    summary.reservation_count > 0 ||
    summary.packing_total > 0 ||
    summary.budget_expense_count > 0
      ? "You're making progress — keep adding the details."
      : "Trip shell ready. Add bookings, budget, and packing items next.";
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

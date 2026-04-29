// Path: ui-mobile/features/trips/workspace/helpers/collaborationGate.ts
// Summary: Implements collaborationGate module logic.

import type { TripResponse } from "../../types";

export const READ_ONLY_TRIP_TITLE = "View-only trip";
export const READ_ONLY_TRIP_BODY =
  "You can follow the plan, but only editors can make changes.";

const WRITE_ROLES = new Set(["owner", "editor", "companion", "member"]);

export function normalizeTripRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function getTripRoleLabel(
  role: string | null | undefined,
  status?: string | null,
): "Owner" | "Can edit" | "View only" | "Pending" {
  if (normalizeTripRole(status) === "pending") return "Pending";

  const normalizedRole = normalizeTripRole(role);
  if (normalizedRole === "owner") return "Owner";
  if (WRITE_ROLES.has(normalizedRole)) return "Can edit";
  return "View only";
}

export function canEditTripRole(
  role: string | null | undefined,
  status?: string | null,
): boolean {
  if (normalizeTripRole(status) === "pending") return false;
  return WRITE_ROLES.has(normalizeTripRole(role));
}

export function getCurrentTripMember(args: {
  trip: TripResponse;
  currentUserEmail: string;
  currentUserId?: number | null;
}) {
  const normalizedEmail = args.currentUserEmail.trim().toLowerCase();
  return args.trip.members.find((member) => {
    const matchesEmail =
      normalizedEmail.length > 0 &&
      member.email.trim().toLowerCase() === normalizedEmail;
    const matchesId =
      typeof args.currentUserId === "number" &&
      member.user_id === args.currentUserId;
    return matchesEmail || matchesId;
  });
}

export function getCurrentTripPermissions(args: {
  trip: TripResponse;
  currentUserEmail: string;
  currentUserId?: number | null;
}) {
  const member = getCurrentTripMember(args);
  const isCreator =
    typeof args.currentUserId === "number" &&
    args.trip.user_id === args.currentUserId;
  const role = isCreator ? "owner" : member?.role;
  const status = isCreator ? undefined : member?.status;
  const isOwner = isCreator || normalizeTripRole(role) === "owner";
  const canEdit = isOwner || canEditTripRole(role, status);

  return {
    role: role ?? null,
    roleLabel: getTripRoleLabel(role, status),
    isOwner,
    canEdit,
    isReadOnly: !canEdit,
  };
}

/**
 * Mirrors web's collaborationGate: a trip is "collaboration active" when more
 * than one member has joined (accepted status or is the owner). This gates the
 * Chat tab and other group-only surfaces.
 */
export function isCollaborationActive(trip: TripResponse): boolean {
  return (
    trip.members.filter(
      (m) => m.role === "owner" || m.status === "accepted",
    ).length > 1
  );
}

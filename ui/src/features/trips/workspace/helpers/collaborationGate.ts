// Path: ui/src/features/trips/workspace/helpers/collaborationGate.ts
// Summary: Implements collaborationGate module logic.

import type { Trip } from "../../../../shared/api/trips";

export function getJoinedMemberCount(trip: Trip): number {
  return trip.members.length;
}

export function isCollaborationActive(trip: Trip): boolean {
  return getJoinedMemberCount(trip) > 1;
}

export function isSoloTripWorkspace(trip: Trip): boolean {
  return !isCollaborationActive(trip);
}

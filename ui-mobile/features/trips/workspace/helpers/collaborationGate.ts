// Path: ui-mobile/features/trips/workspace/helpers/collaborationGate.ts
// Summary: Implements collaborationGate module logic.

import type { TripResponse } from "../../types";

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

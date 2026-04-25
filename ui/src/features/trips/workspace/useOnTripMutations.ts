import { useMemo } from "react";

import {
  useOnTripMutations as useInner,
  type MutationFeedback,
  type UseOnTripMutationsOptions,
  type UseOnTripMutationsResult,
} from "./onTrip/hooks/useOnTripMutations";

export type { MutationFeedback, UseOnTripMutationsOptions, UseOnTripMutationsResult };

export type WorkspaceOnTripResult = UseOnTripMutationsResult & {
  /** Returns true while a network write is in-flight for the given stop_ref. */
  isUpdatingStop: (stopRef: string) => boolean;
};

/**
 * Workspace-level wrapper around the inner on-trip mutations hook.
 * Exposed at the workspace path so parent containers (TripList, etc.) can
 * import from a single stable location rather than the deep inner path.
 *
 * Adds `isUpdatingStop` as a per-ref convenience over the raw `statusPending`
 * map so presentational components get a clean boolean accessor.
 */
export function useOnTripMutations(
  options: UseOnTripMutationsOptions,
): WorkspaceOnTripResult {
  const inner = useInner(options);

  // Stable function reference: only recreated when the underlying pending map
  // reference changes (i.e. a write starts or settles).
  const isUpdatingStop = useMemo(
    () => (stopRef: string) => Boolean(inner.statusPending[stopRef]),
    [inner.statusPending],
  );

  return { ...inner, isUpdatingStop };
}

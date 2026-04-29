// Path: ui/src/features/trips/workspace/onTrip/deriveStopVisualState.ts
// Summary: Implements deriveStopVisualState module logic.

import type { TripExecutionStatus, TripOnTripBlocker } from "../../../../shared/api/trips";
import type { StopVM, TimelineRowVM } from "./types";

function blockerReasonForStop(
  stop: StopVM,
  blockers: TripOnTripBlocker[],
): string | null {
  if (!stop.stop_ref) return null;
  // Today we don't have a formal blocker->stopRef linkage in the schema; treat
  // all blockers as global. If the API adds stop scoping later, we can refine.
  void blockers;
  return null;
}

export function deriveStopVisualState(args: {
  stop: StopVM;
  isNow: boolean;
  isNext: boolean;
  blockers: TripOnTripBlocker[];
  actions: {
    onNavigate: () => void;
    onConfirm: () => void;
    onSkip: () => void;
    onReset: () => void;
  };
}): TimelineRowVM {
  const { stop, isNow, isNext, blockers, actions } = args;
  const status: TripExecutionStatus = stop.effectiveStatus;
  const isDone = status === "confirmed" || status === "skipped";

  const blockerReason = blockerReasonForStop(stop, blockers);
  if (blockerReason) {
    return { variant: "blocked", stop, reason: blockerReason };
  }

  if (isNow) {
    return {
      variant: "now",
      stop,
      pending: stop.isPending,
      onNavigate: actions.onNavigate,
      onConfirm: actions.onConfirm,
      onSkip: actions.onSkip,
      onReset: actions.onReset,
    };
  }

  if (isNext && !isDone) {
    return {
      variant: "next",
      stop,
      pending: stop.isPending,
      onNavigate: actions.onNavigate,
      onConfirm: actions.onConfirm,
      onSkip: actions.onSkip,
    };
  }

  if (isDone) return { variant: "done", stop };

  return { variant: "upcoming", stop };
}


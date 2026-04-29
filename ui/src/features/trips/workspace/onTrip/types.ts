// Path: ui/src/features/trips/workspace/onTrip/types.ts
// Summary: Implements types module logic.

import type {
  TripExecutionStatus,
  TripOnTripBlocker,
  TripOnTripStopSnapshot,
  TripOnTripUnplannedStop,
} from "../../../../shared/api/trips";

export type StopVM = TripOnTripStopSnapshot & {
  key: string;
  effectiveStatus: TripExecutionStatus;
  isPending: boolean;
  isReadOnly: boolean;
};

export type TimelineVariant = "done" | "now" | "next" | "upcoming" | "blocked";

export type TimelineRowVM =
  | { variant: "done"; stop: StopVM }
  | {
      variant: "now";
      stop: StopVM;
      pending: boolean;
      onNavigate: () => void;
      onConfirm: () => void;
      onSkip: () => void;
      onReset: () => void;
    }
  | {
      variant: "next";
      stop: StopVM;
      pending: boolean;
      onNavigate: () => void;
      onConfirm: () => void;
      onSkip: () => void;
    }
  | { variant: "upcoming"; stop: StopVM }
  | { variant: "blocked"; stop: StopVM; reason: string };

export type OnTripViewModel = {
  now: StopVM | null;
  next: StopVM | null;
  timeline: TimelineRowVM[];
  unplanned: Array<TripOnTripUnplannedStop & { isPending: boolean }>;
  blockers: TripOnTripBlocker[];
  defaultLogDate: string;
};


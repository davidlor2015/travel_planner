// Path: ui/src/features/trips/workspace/onTrip/deriveStopVisualState.test.ts
// Summary: Covers automated tests for deriveStopVisualState.test behavior.

import { describe, expect, it } from "vitest";

import type { StopVM } from "./types";
import { deriveStopVisualState } from "./deriveStopVisualState";

const baseStop = (overrides: Partial<StopVM> = {}): StopVM => ({
  day_number: 1,
  day_date: "2026-04-22",
  title: "Stop",
  time: "09:00",
  location: "Somewhere",
  lat: null,
  lon: null,
  status: "planned",
  source: "day_date_exact",
  confidence: "high",
  stop_ref: "123",
  execution_status: null,
  key: "123",
  effectiveStatus: "planned",
  isPending: false,
  isReadOnly: false,
  ...overrides,
});

describe("deriveStopVisualState", () => {
  it("returns now variant when isNow", () => {
    const row = deriveStopVisualState({
      stop: baseStop(),
      isNow: true,
      isNext: false,
      blockers: [],
      actions: {
        onNavigate: () => {},
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      },
    });
    expect(row.variant).toBe("now");
  });

  it("returns next variant when isNext and not terminal", () => {
    const row = deriveStopVisualState({
      stop: baseStop({ effectiveStatus: "planned" }),
      isNow: false,
      isNext: true,
      blockers: [],
      actions: {
        onNavigate: () => {},
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      },
    });
    expect(row.variant).toBe("next");
  });

  it("returns done variant when confirmed", () => {
    const row = deriveStopVisualState({
      stop: baseStop({ effectiveStatus: "confirmed" }),
      isNow: false,
      isNext: false,
      blockers: [],
      actions: {
        onNavigate: () => {},
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      },
    });
    expect(row.variant).toBe("done");
  });

  it("returns upcoming variant when planned and not now/next", () => {
    const row = deriveStopVisualState({
      stop: baseStop({ effectiveStatus: "planned" }),
      isNow: false,
      isNext: false,
      blockers: [],
      actions: {
        onNavigate: () => {},
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      },
    });
    expect(row.variant).toBe("upcoming");
  });
});


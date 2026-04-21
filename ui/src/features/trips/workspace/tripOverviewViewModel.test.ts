import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Itinerary } from "../../../shared/api/ai";
import type { Trip } from "../../../shared/api/trips";
import type { BudgetSummary, PackingSummary, ReservationSummary } from "./types";
import {
  buildTripAttentionItems,
  buildTripReadinessSnapshot,
} from "./tripOverviewViewModel";

const FROZEN_NOW = new Date("2026-04-15T12:00:00.000Z");

function tripBase(over: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: "Readiness trip",
    destination: "Rome",
    description: null,
    notes: null,
    start_date: "2026-04-20",
    end_date: "2026-04-26",
    user_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    member_count: 1,
    members: [
      {
        user_id: 1,
        email: "owner@example.com",
        role: "owner",
        joined_at: "2026-01-01T00:00:00Z",
        status: "active",
      },
    ],
    pending_invites: [],
    ...over,
  };
}

function itineraryWithoutStatuses(): Itinerary {
  return {
    title: "No status yet",
    summary: "Draft",
    days: [
      {
        day_number: 1,
        date: "2026-04-20",
        items: [
          {
            time: "09:00",
            title: "Hotel check-in",
            location: "Center",
            lat: null,
            lon: null,
            notes: null,
            cost_estimate: null,
            status: "planned",
          },
        ],
      },
    ],
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "manual",
    source_label: "Manual",
    fallback_used: false,
  };
}

function itineraryWithOperationalAnchors(): Itinerary {
  return {
    ...itineraryWithoutStatuses(),
    days: [
      {
        day_number: 1,
        date: "2026-04-20",
        anchors: [
          {
            type: "flight",
            label: "UA 101",
            time: "08:00",
            note: null,
            handled_by: "friend@example.com",
            booked_by: "friend@example.com",
          },
          {
            type: "hotel_checkin",
            label: "Hotel check-in",
            time: "15:00",
            note: null,
            handled_by: null,
            booked_by: null,
          },
        ],
        items: [],
      },
    ],
  };
}

const packing: PackingSummary = {
  total: 0,
  checked: 0,
  progressPct: 0,
  loading: false,
};

const budget: BudgetSummary = {
  limit: null,
  totalSpent: 0,
  remaining: null,
  isOverBudget: false,
  expenseCount: 0,
  loading: false,
};

const reservations: ReservationSummary = {
  total: 0,
  upcoming: 0,
  loading: false,
};

describe("trip overview derivation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps readiness unknown while summaries are loading", () => {
    const readiness = buildTripReadinessSnapshot(
      tripBase(),
      { ...packing, loading: true },
      budget,
      reservations,
      false,
      null,
    );
    expect(readiness.score).toBeNull();
    expect(readiness.unknownState).toBe("loading");
  });

  it("does not infer optimistic readiness from unconfigured signals", () => {
    const readiness = buildTripReadinessSnapshot(
      tripBase(),
      packing,
      budget,
      reservations,
      true,
      itineraryWithoutStatuses(),
    );
    expect(readiness.score).toBeNull();
    expect(readiness.unknownState).toBe("no_signals");
    expect(readiness.knownSignalCount).toBe(0);
  });

  it("does not score readiness from pending invites alone", () => {
    const readiness = buildTripReadinessSnapshot(
      tripBase({
        pending_invites: [
          {
            id: 9,
            email: "invitee@example.com",
            status: "pending",
            created_at: "2026-01-01T00:00:00Z",
            expires_at: "2026-02-01T00:00:00Z",
          },
        ],
      }),
      packing,
      budget,
      reservations,
      true,
      null,
    );
    expect(readiness.score).toBeNull();
    expect(readiness.unknownState).toBe("no_signals");
  });

  it("surfaces unknown readiness as a conservative nudge near departure", () => {
    const attention = buildTripAttentionItems(
      tripBase(),
      packing,
      budget,
      reservations,
      true,
      null,
    );
    expect(attention.some((row) => row.id === "readiness-unknown-config")).toBe(
      true,
    );
    expect(attention.some((row) => row.severity === "blocker")).toBe(false);
  });

  it("includes operational anchors in ownership action signals", () => {
    const groupTrip = tripBase({
      members: [
        {
          user_id: 1,
          email: "owner@example.com",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          status: "active",
        },
        {
          user_id: 2,
          email: "friend@example.com",
          role: "member",
          joined_at: "2026-01-01T00:00:00Z",
          status: "active",
        },
      ],
      member_count: 2,
    });

    const attention = buildTripAttentionItems(
      groupTrip,
      packing,
      budget,
      reservations,
      true,
      itineraryWithOperationalAnchors(),
      "owner@example.com",
    );

    expect(attention.some((row) => row.id === "itinerary-waiting-on-owner")).toBe(
      true,
    );
    expect(attention.some((row) => row.id === "itinerary-ownership-open")).toBe(
      true,
    );
  });
});

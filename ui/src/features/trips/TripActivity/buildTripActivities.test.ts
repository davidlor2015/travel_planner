import { describe, expect, it } from "vitest";

import type { Trip } from "../../../shared/api/trips";
import { buildTripActivities } from "./buildTripActivities";

function trip(over: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: "Past trip",
    destination: "Lisbon",
    description: null,
    notes: null,
    start_date: "2026-01-01",
    end_date: "2026-01-05",
    user_id: 1,
    created_at: "2025-12-01T00:00:00Z",
    member_count: 1,
    members: [
      {
        user_id: 1,
        email: "owner@example.com",
        role: "owner",
        joined_at: "2025-12-01T00:00:00Z",
        status: "active",
      },
    ],
    pending_invites: [],
    ...over,
  };
}

describe("buildTripActivities", () => {
  it("does not invent a fresh departure reminder for a completed trip", () => {
    const activities = buildTripActivities({
      trip: trip(),
      savedItinerary: null,
      pendingItinerary: null,
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(activities.some((item) => item.id.startsWith("departure-reminder"))).toBe(
      false,
    );
  });

  it("only emits an over-budget activity when a real budget limit exists", () => {
    const activities = buildTripActivities({
      trip: trip({
        start_date: "2026-05-01",
        end_date: "2026-05-05",
      }),
      savedItinerary: null,
      pendingItinerary: null,
      budgetSummary: {
        limit: null,
        totalSpent: 100,
        remaining: null,
        isOverBudget: true,
        expenseCount: 1,
        loading: false,
      },
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(activities.some((item) => item.id === "budget-over")).toBe(false);
  });
});

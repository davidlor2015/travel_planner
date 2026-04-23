import { describe, expect, it } from "vitest";

import type { Itinerary } from "../../../../shared/api/ai";
import type { Trip } from "../../../../shared/api/trips";
import {
  buildWorkspaceActivityModel,
  buildWorkspaceActivitySnapshot,
  coerceWorkspaceActivitySnapshot,
  deriveWorkspaceActivityChanges,
  workspaceActivitySignature,
} from "./workspaceActivityModel";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 11,
    title: "Kyoto",
    destination: "Kyoto",
    description: null,
    notes: null,
    start_date: "2026-10-01",
    end_date: "2026-10-05",
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
    ...overrides,
  };
}

function makeItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  return {
    title: "Plan",
    summary: "Summary",
    days: [
      {
        day_number: 1,
        date: "2026-10-01",
        day_title: null,
        day_note: null,
        anchors: [
          {
            type: "hotel_checkin",
            label: "Ryokan check-in",
            time: "15:00",
            note: null,
          },
        ],
        items: [
          {
            time: "09:00",
            title: "Gion walk",
            location: "Gion",
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
    ...overrides,
  };
}

describe("workspaceActivityModel", () => {
  it("builds a deterministic snapshot + signature from real workspace state", () => {
    const input = {
      trip: makeTrip({ notes: "Bring adapters" }),
      itinerary: makeItinerary(),
      packingSummary: { total: 4, checked: 1, progressPct: 25, loading: false },
      budgetSummary: {
        limit: 1000,
        totalSpent: 250,
        remaining: 750,
        isOverBudget: false,
        expenseCount: 2,
        loading: false,
      },
      reservationSummary: { total: 2, upcoming: 1, loading: false },
      workspace: {
        hasPendingDraft: false,
        tripActionError: null,
        draftActionError: null,
        streamError: null,
      },
    };

    const a = buildWorkspaceActivitySnapshot(input);
    const b = buildWorkspaceActivitySnapshot(input);
    expect(a).toEqual(b);
    expect(workspaceActivitySignature(a)).toBe(workspaceActivitySignature(b));
    expect(a.itinerary_anchor_count).toBe(1);
    expect(a.itinerary_planned_count).toBe(1);
    expect(a.has_trip_notes).toBe(true);
  });

  it("derives conservative typed changes from previous snapshot", () => {
    const base = buildWorkspaceActivitySnapshot({
      trip: makeTrip(),
      itinerary: makeItinerary(),
      packingSummary: { total: 2, checked: 1, progressPct: 50, loading: false },
      budgetSummary: {
        limit: 500,
        totalSpent: 100,
        remaining: 400,
        isOverBudget: false,
        expenseCount: 1,
        loading: false,
      },
      reservationSummary: { total: 1, upcoming: 1, loading: false },
      workspace: {
        hasPendingDraft: false,
        tripActionError: null,
        draftActionError: null,
        streamError: null,
      },
    });

    const current = {
      ...base,
      has_stream_error: true,
      packing_checked: 2,
      booking_total: 3,
    };
    const changes = deriveWorkspaceActivityChanges(current, base);
    expect(changes.map((item) => item.category)).toEqual(["system", "bookings", "packing"]);
  });

  it("builds unseen strip + drawer from canonical snapshot diff and keeps timestamps explicit", () => {
    const previous = buildWorkspaceActivitySnapshot({
      trip: makeTrip(),
      itinerary: makeItinerary(),
      packingSummary: { total: 3, checked: 0, progressPct: 0, loading: false },
      budgetSummary: {
        limit: 500,
        totalSpent: 100,
        remaining: 400,
        isOverBudget: false,
        expenseCount: 1,
        loading: false,
      },
      reservationSummary: { total: 1, upcoming: 1, loading: false },
      workspace: {
        hasPendingDraft: false,
        tripActionError: null,
        draftActionError: null,
        streamError: null,
      },
    });

    const model = buildWorkspaceActivityModel({
      input: {
        trip: makeTrip(),
        itinerary: makeItinerary(),
        packingSummary: { total: 3, checked: 3, progressPct: 100, loading: false },
        budgetSummary: {
          limit: 500,
          totalSpent: 100,
          remaining: 400,
          isOverBudget: false,
          expenseCount: 1,
          loading: false,
        },
        reservationSummary: { total: 1, upcoming: 1, loading: false },
        workspace: {
          hasPendingDraft: false,
          tripActionError: null,
          draftActionError: null,
          streamError: null,
        },
      },
      lastSeenSignature: workspaceActivitySignature(previous),
      lastSeenSnapshot: previous,
    });

    expect(model.hasUnseenChanges).toBe(true);
    expect(model.stripItems.length).toBeGreaterThan(0);
    expect(model.drawerItems.every((item) => item.occurredAt === null)).toBe(true);
  });

  it("coerces valid snapshots and rejects malformed snapshot payloads", () => {
    const snapshot = buildWorkspaceActivitySnapshot({
      trip: makeTrip(),
      itinerary: makeItinerary(),
      packingSummary: { total: 1, checked: 0, progressPct: 0, loading: false },
      budgetSummary: {
        limit: null,
        totalSpent: 0,
        remaining: null,
        isOverBudget: false,
        expenseCount: 0,
        loading: false,
      },
      reservationSummary: { total: 0, upcoming: 0, loading: false },
      workspace: {
        hasPendingDraft: false,
        tripActionError: null,
        draftActionError: null,
        streamError: null,
      },
    });

    expect(coerceWorkspaceActivitySnapshot(snapshot as unknown as Record<string, unknown>)).toEqual(
      snapshot,
    );
    expect(coerceWorkspaceActivitySnapshot({ version: 2, trip_id: 11 })).toBeNull();
  });
});

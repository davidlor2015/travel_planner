import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Trip } from "../../../shared/api/trips";
import type { BudgetSummary, PackingSummary, ReservationSummary } from "./types";
import {
  deriveTripActionItems,
  type TripActionDerivationInput,
  type TripActionInputs,
  type TripWorkspaceSignals,
} from "./deriveTripActionItems";

/** Fixed “today” so domain date rules are stable in CI. */
const FROZEN_NOW = new Date("2026-04-15T12:00:00.000Z");

function tripBase(over: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: "Test trip",
    destination: "Somewhere",
    description: null,
    notes: null,
    start_date: "2026-06-01",
    end_date: "2026-06-10",
    user_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    member_count: 2,
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
        email: "guest@example.com",
        role: "member",
        joined_at: "2026-01-02T00:00:00Z",
        status: "active",
      },
    ],
    pending_invites: [],
    ...over,
  };
}

const loadedPacking: PackingSummary = {
  total: 0,
  checked: 0,
  progressPct: 0,
  loading: false,
};
const loadedBudget: BudgetSummary = {
  limit: null,
  totalSpent: 0,
  remaining: null,
  isOverBudget: false,
  expenseCount: 0,
  loading: false,
};
const loadedRes: ReservationSummary = {
  total: 0,
  upcoming: 0,
  loading: false,
};

function quietWorkspace(): TripWorkspaceSignals {
  return {
    tripActionError: null,
    draftActionError: null,
    streamError: null,
    hasPendingDraft: false,
    isApplyingItinerary: false,
    unreadActivityCount: 0,
    activityMuted: false,
  };
}

function fullInput(
  workspace: TripWorkspaceSignals,
  trip: Trip = tripBase(),
  overrides?: {
    packing?: PackingSummary;
    budget?: BudgetSummary;
    reservations?: ReservationSummary;
    summariesLoaded?: boolean;
  },
): TripActionInputs {
  return {
    trip,
    packing: overrides?.packing ?? loadedPacking,
    budget: overrides?.budget ?? loadedBudget,
    reservations: overrides?.reservations ?? loadedRes,
    summariesLoaded: overrides?.summariesLoaded ?? true,
    workspace,
  };
}

describe("deriveTripActionItems", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("no trip selection", () => {
    it("returns an empty list when trip is null (no fabricated items)", () => {
      const input: TripActionDerivationInput = { trip: null };
      expect(deriveTripActionItems(input)).toEqual([]);
    });
  });

  describe("fully empty workspace signals", () => {
    it("returns no workspace rows when all workspace fields are empty/false", () => {
      const items = deriveTripActionItems(fullInput(quietWorkspace()));
      expect(items.some((i) => i.id.startsWith("workspace-"))).toBe(false);
    });
  });

  describe("partially complete data", () => {
    it("uses the limited domain path when summaries are still loading", () => {
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), {
          packing: { ...loadedPacking, loading: true },
          budget: loadedBudget,
          reservations: loadedRes,
          summariesLoaded: false,
        }),
      );
      expect(items.find((i) => i.id === "budget-over")).toBeUndefined();
      expect(items.find((i) => i.id === "packing-behind")).toBeUndefined();
    });

    it("still surfaces pending invites from trip data when summaries are not loaded", () => {
      const trip = tripBase({
        pending_invites: [
          {
            id: 1,
            email: "pending@example.com",
            status: "pending",
            created_at: "2026-01-01T00:00:00Z",
            expires_at: "2026-02-01T00:00:00Z",
          },
        ],
      });
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), trip, {
          summariesLoaded: false,
        }),
      );
      expect(items.some((i) => i.id === "invites-pending")).toBe(true);
    });
  });

  describe("fully ready trip (domain quiet, workspace quiet)", () => {
    it("returns no items when summaries are healthy and trip is far enough out", () => {
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), {
          packing: {
            total: 8,
            checked: 8,
            progressPct: 100,
            loading: false,
          },
          budget: {
            limit: 2000,
            totalSpent: 200,
            remaining: 1800,
            isOverBudget: false,
            expenseCount: 2,
            loading: false,
          },
          reservations: { total: 3, upcoming: 2, loading: false },
          summariesLoaded: true,
        }),
      );
      expect(items).toEqual([]);
    });
  });

  describe("workspace signals", () => {
    it("surfaces draft mutation errors as blocker", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          draftActionError: "Apply failed",
        }),
      );
      expect(items[0]?.id).toBe("workspace-draft-mutation-error");
      expect(items[0]?.severity).toBe("blocker");
    });

    it("surfaces trip-level mutation errors as blocker", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          tripActionError: "Network failed",
        }),
      );
      expect(items[0]?.id).toBe("workspace-trip-mutation-error");
      expect(items[0]?.severity).toBe("blocker");
    });

    it("does not add draft-error row for whitespace-only messages", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          draftActionError: "   \n\t  ",
        }),
      );
      expect(
        items.find((i) => i.id === "workspace-draft-mutation-error"),
      ).toBeUndefined();
    });

    it("adds stream error when non-empty", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          streamError: "Stream interrupted",
        }),
      );
      expect(items.find((i) => i.id === "workspace-stream-error")?.severity).toBe(
        "watch",
      );
    });

    it("omits stream error when empty after trim", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          streamError: "  ",
        }),
      );
      expect(items.find((i) => i.id === "workspace-stream-error")).toBeUndefined();
    });

    it("adds draft pending when not applying", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          hasPendingDraft: true,
          isApplyingItinerary: false,
        }),
      );
      expect(items.find((i) => i.id === "workspace-draft-pending")).toBeDefined();
    });

    it("suppresses draft pending while applying", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          hasPendingDraft: true,
          isApplyingItinerary: true,
        }),
      );
      expect(items.find((i) => i.id === "workspace-draft-pending")).toBeUndefined();
    });

    it("nudges unread activity when not muted", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          unreadActivityCount: 4,
          activityMuted: false,
        }),
      );
      expect(
        items.find((i) => i.id === "workspace-unread-activity")?.command,
      ).toEqual({ kind: "open_activity_drawer" });
    });

    it("omits unread activity when muted", () => {
      const items = deriveTripActionItems(
        fullInput({
          ...quietWorkspace(),
          unreadActivityCount: 99,
          activityMuted: true,
        }),
      );
      expect(items.find((i) => i.id === "workspace-unread-activity")).toBeUndefined();
    });
  });

  describe("mixed readiness and itinerary status", () => {
    it("sorts blockers before watch when budget and workspace both fire", () => {
      const items = deriveTripActionItems(
        fullInput(
          {
            ...quietWorkspace(),
            draftActionError: "Apply failed",
          },
          tripBase(),
          {
            budget: {
              limit: 100,
              totalSpent: 200,
              remaining: -100,
              isOverBudget: true,
              expenseCount: 3,
              loading: false,
            },
            summariesLoaded: true,
          },
        ),
      );
      expect(items[0]?.id).toBe("workspace-draft-mutation-error");
      expect(items.some((i) => i.id === "budget-over")).toBe(true);
    });

    it("combines stream error, draft pending, and domain attention without duplicate ids", () => {
      const trip = tripBase({
        pending_invites: [
          {
            id: 9,
            email: "x@y.com",
            status: "pending",
            created_at: "2026-01-01T00:00:00Z",
            expires_at: "2026-02-01T00:00:00Z",
          },
        ],
      });
      const items = deriveTripActionItems(
        fullInput(
          {
            ...quietWorkspace(),
            streamError: "timeout",
            hasPendingDraft: true,
            isApplyingItinerary: false,
            unreadActivityCount: 1,
            activityMuted: false,
          },
          trip,
        ),
      );
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(items.length).toBeLessThanOrEqual(5);
      expect(items.map((i) => i.id).includes("workspace-stream-error")).toBe(true);
      expect(items.map((i) => i.id).includes("invites-pending")).toBe(true);
    });
  });

  describe("domain rules without faking missing constraints", () => {
    it("does not emit budget-over when limit is unset even if isOverBudget is true", () => {
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), {
          budget: {
            limit: null,
            totalSpent: 500,
            remaining: null,
            isOverBudget: true,
            expenseCount: 1,
            loading: false,
          },
          summariesLoaded: true,
        }),
      );
      expect(items.find((i) => i.id === "budget-over")).toBeUndefined();
    });
  });

  describe("date-sensitive domain rules (frozen clock)", () => {
    it("can surface packing-behind when trip is soon and packing lags", () => {
      const trip = tripBase({
        start_date: "2026-04-22",
        end_date: "2026-04-28",
      });
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), trip, {
          packing: {
            total: 10,
            checked: 2,
            progressPct: 20,
            loading: false,
          },
          summariesLoaded: true,
        }),
      );
      expect(items.some((i) => i.id === "packing-behind")).toBe(true);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Itinerary } from "../../../shared/api/ai";
import type { Trip, TripMemberReadinessItem } from "../../../shared/api/trips";
import type { BudgetSummary, PackingSummary, ReservationSummary } from "./types";
import {
  buildTripActionabilityModel,
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

function itineraryBase(over: Partial<Itinerary> = {}): Itinerary {
  return {
    title: "Test itinerary",
    summary: "A real plan",
    days: [
      {
        day_number: 1,
        date: "2026-06-01",
        items: [
          {
            time: "09:00",
            title: "Museum",
            location: "Main square",
            lat: null,
            lon: null,
            notes: null,
            cost_estimate: null,
            status: "confirmed",
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
    itinerary?: Itinerary | null;
    memberReadiness?: TripMemberReadinessItem[] | null;
  },
): TripActionInputs {
  return {
    trip,
    actorEmail: "owner@example.com",
    packing: overrides?.packing ?? loadedPacking,
    budget: overrides?.budget ?? loadedBudget,
    reservations: overrides?.reservations ?? loadedRes,
    summariesLoaded: overrides?.summariesLoaded ?? true,
    itinerary:
      overrides && "itinerary" in overrides
        ? (overrides.itinerary ?? null)
        : itineraryBase(),
    memberReadiness:
      overrides && "memberReadiness" in overrides
        ? (overrides.memberReadiness ?? null)
        : null,
    workspace,
  };
}

describe("deriveTripActionItems", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
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

  describe("solo trips and itinerary-derived state", () => {
    it("does not ask solo travelers to invite people", () => {
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase({ members: [], member_count: 1 })),
      );
      expect(items.find((i) => i.id === "solo-group")).toBeUndefined();
      expect(items.find((i) => i.title.toLowerCase().includes("invite"))).toBeUndefined();
    });

    it("surfaces a missing itinerary as a real next action", () => {
      const items = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), { itinerary: null }),
      );
      expect(items.find((i) => i.id === "itinerary-missing")?.command).toEqual({
        kind: "open_tab",
        tab: "overview",
      });
    });

    it("only surfaces stop ownership gaps after ownership is being used", () => {
      const noOwnershipItems = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), {
          itinerary: itineraryBase({
            days: [
              {
                day_number: 1,
                date: "2026-06-01",
                items: [
                  {
                    time: "09:00",
                    title: "Museum",
                    location: null,
                    lat: null,
                    lon: null,
                    notes: null,
                    cost_estimate: null,
                    status: "planned",
                  },
                ],
              },
            ],
          }),
        }),
      );
      expect(
        noOwnershipItems.find((i) => i.id === "itinerary-ownership-open"),
      ).toBeUndefined();

      const partiallyOwnedItems = deriveTripActionItems(
        fullInput(quietWorkspace(), tripBase(), {
          itinerary: itineraryBase({
            days: [
              {
                day_number: 1,
                date: "2026-06-01",
                items: [
                  {
                    time: "09:00",
                    title: "Museum",
                    location: null,
                    lat: null,
                    lon: null,
                    notes: "[ownership:handledBy=Alex]",
                    cost_estimate: null,
                    status: "planned",
                  },
                  {
                    time: "12:00",
                    title: "Lunch",
                    location: null,
                    lat: null,
                    lon: null,
                    notes: null,
                    cost_estimate: null,
                    status: "planned",
                  },
                ],
              },
            ],
          }),
        }),
      );
      expect(
        partiallyOwnedItems.find((i) => i.id === "itinerary-ownership-open"),
      ).toBeDefined();
    });
  });

  describe("actor-aware ownership actions", () => {
    it("prioritizes stops assigned to the current traveler", () => {
      const items = deriveTripActionItems(
        fullInput(
          quietWorkspace(),
          tripBase(),
          {
            itinerary: itineraryBase({
              days: [
                {
                  day_number: 1,
                  date: "2026-04-20",
                  items: [
                    {
                      time: "09:00",
                      title: "Museum",
                      location: null,
                      lat: null,
                      lon: null,
                      notes: "[ownership:handledBy=owner@example.com]",
                      cost_estimate: null,
                      status: "planned",
                    },
                  ],
                },
              ],
            }),
          },
        ),
      );
      expect(items.find((i) => i.id === "itinerary-owned-by-you-open")).toBeDefined();
    });

    it("surfaces waiting-on signals when another known member owns planned stops", () => {
      const input = fullInput(
        quietWorkspace(),
        tripBase(),
        {
          itinerary: itineraryBase({
            days: [
              {
                day_number: 1,
                date: "2026-04-20",
                items: [
                  {
                    time: "09:00",
                    title: "Museum",
                    location: null,
                    lat: null,
                    lon: null,
                    notes: "[ownership:handledBy=guest@example.com]",
                    cost_estimate: null,
                    status: "planned",
                  },
                ],
              },
            ],
          }),
          memberReadiness: [
            {
              user_id: 2,
              email: "guest@example.com",
              role: "member",
              readiness_score: 50,
              blocker_count: 2,
              unknown: false,
              status: "needs_attention",
            },
          ],
        },
      );
      const items = deriveTripActionItems({
        ...input,
        actorEmail: "owner@example.com",
      });
      expect(items.find((i) => i.id === "itinerary-waiting-on-owner")).toBeDefined();
      expect(items.find((i) => i.id === "itinerary-owned-by-you-open")).toBeUndefined();
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

    it("shows unread activity only when no other actions are present", () => {
      const items = deriveTripActionItems({
        ...fullInput({
          ...quietWorkspace(),
          unreadActivityCount: 2,
          activityMuted: false,
        }),
        itinerary: itineraryBase({
          days: [],
        }),
      });
      expect(items.find((i) => i.id === "workspace-unread-activity")?.command).toEqual(
        { kind: "open_activity_drawer" },
      );
    });

    it("keeps unread activity as a low-priority nudge even when stronger items exist", () => {
      const items = deriveTripActionItems(
        fullInput(
          {
            ...quietWorkspace(),
            unreadActivityCount: 2,
            activityMuted: false,
          },
          tripBase(),
          {
            budget: {
              limit: 100,
              totalSpent: 120,
              remaining: -20,
              isOverBudget: true,
              expenseCount: 2,
              loading: false,
            },
          },
        ),
      );
      expect(items.find((i) => i.id === "budget-over")).toBeDefined();
      expect(items.find((i) => i.id === "workspace-unread-activity")).toBeDefined();
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

  describe("canonical actionability model", () => {
    it("keeps system failures separate from operational ranking", () => {
      const model = buildTripActionabilityModel(
        fullInput(
          {
            ...quietWorkspace(),
            draftActionError: "Draft save failed",
          },
          tripBase(),
          {
            itinerary: null,
            summariesLoaded: true,
          },
        ),
      );
      expect(model.systemFailures.some((item) => item.id === "workspace-draft-mutation-error")).toBe(true);
      expect(model.rankedOperationalActions.some((item) => item.id === "itinerary-missing")).toBe(true);
      expect(model.systemFailures.some((item) => item.id === "itinerary-missing")).toBe(false);
    });

    it("exposes typed reasons for explainable wording", () => {
      const model = buildTripActionabilityModel(
        fullInput(
          {
            ...quietWorkspace(),
            hasPendingDraft: true,
          },
          tripBase(),
          { summariesLoaded: true },
        ),
      );
      expect(model.rankedOperationalActions[0]?.reason).toBe("draft_pending_publish");
      expect(model.rankedOperationalActions[0]?.intent).toBe("draft_publish");
    });

    it("applies solo caps to secondary actions", () => {
      const soloTrip = tripBase({
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
      });
      const model = buildTripActionabilityModel(
        fullInput(
          {
            ...quietWorkspace(),
            hasPendingDraft: true,
          },
          soloTrip,
          {
            itinerary: null,
            reservations: { total: 0, upcoming: 0, loading: false },
            summariesLoaded: true,
          },
        ),
      );
      expect(model.secondaryActions.length).toBeLessThanOrEqual(2);
    });
  });
});

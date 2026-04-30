// Path: ui/src/features/trips/workspace/tabs/OverviewTab.applyMoment.test.tsx
// Summary: Verifies the post-apply confirmation banner on the OverviewTab.

/**
 * The apply-itinerary handoff is the product climax of the create flow.
 * These tests cover the confirmation banner that marks the moment:
 *
 *  1. With appliedSuccess + a saved itinerary in place, the banner renders
 *     warm Roen-voice copy.
 *  2. Without appliedSuccess, the banner does not render.
 *  3. While a draft is still pending, the banner does not pre-empt the
 *     editor — apply belongs to the saved-state moment.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Itinerary } from "../../../../shared/api/ai";
import type { Trip } from "../../../../shared/api/trips";
import type { TripActionabilityModel } from "../models/deriveTripActionItems";
import { OverviewTab } from "./OverviewTab";

function makeTrip(): Trip {
  return {
    id: 1,
    title: "Lisbon Long Weekend",
    destination: "Lisbon",
    description: null,
    notes: null,
    start_date: "2026-05-01",
    end_date: "2026-05-03",
    user_id: 100,
    created_at: "2026-04-01T00:00:00Z",
    member_count: 1,
    members: [
      {
        user_id: 100,
        email: "you@example.com",
        full_name: "You",
        status: "owner",
        role: "owner",
        invited_at: null,
        accepted_at: null,
        workspace_last_seen_signature: null,
        workspace_last_seen_snapshot: null,
        workspace_last_seen_at: null,
      } as unknown as Trip["members"][number],
    ],
    pending_invites: [],
  };
}

function makeItinerary(): Itinerary {
  return {
    title: "Lisbon Long Weekend",
    summary: "Three calm days of pastel houses and slow lunches.",
    days: [
      {
        day_number: 1,
        date: "2026-05-01",
        day_title: "Arrival",
        items: [
          {
            time: "5:00 PM",
            title: "Hotel check-in",
            location: "Alfama",
            lat: null,
            lon: null,
            notes: null,
            cost_estimate: null,
          },
        ],
      },
    ],
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "ai",
    source_label: "AI",
    fallback_used: false,
  };
}

const emptyActionability: TripActionabilityModel = {
  state: "steady",
  systemFailures: [],
  rankedOperationalActions: [],
  primaryAction: null,
  secondaryActions: [],
};

const baseProps = {
  trip: makeTrip(),
  packingSummary: { total: 0, checked: 0, progressPct: 0, loading: false },
  budgetSummary: {
    limit: null,
    totalSpent: 0,
    remaining: null,
    isOverBudget: false,
    expenseCount: 0,
    loading: false,
  },
  reservationSummary: { total: 0, upcoming: 0, loading: false },
  actionability: emptyActionability,
  activities: [],
  isStreaming: false,
  hasStreamContent: false,
  streamError: null,
  isAnyGenerating: false,
  isRegenerating: false,
  isApplying: false,
  draftMutationState: "idle" as const,
  draftPublishError: null,
  pendingItinerary: null,
  draftPlanMeta: null,
  controls: null,
  lockedItemIds: [],
  favoriteItemIds: [],
  onStartStream: () => {},
  onCancelStream: () => {},
  onEditSavedAsDraft: () => {},
  onApply: () => {},
  onMoveItem: () => {},
  onToggleLock: () => {},
  onToggleFavorite: () => {},
  onRegenerateDayChange: () => {},
  onRegenerateTimeBlockChange: () => {},
  onRegenerateVariantChange: () => {},
  onRegenerate: () => {},
  onAddDay: () => {},
  onOpenTab: () => {},
  onOpenActivityDrawer: () => {},
  onActionCommand: () => {},
  onItineraryDayToggle: () => {},
};

describe("OverviewTab — apply moment", () => {
  it("renders the confirmation banner after a successful apply", () => {
    const html = renderToStaticMarkup(
      React.createElement(OverviewTab, {
        ...baseProps,
        appliedSuccess: true,
        savedItinerary: makeItinerary(),
      }),
    );

    expect(html).toContain("Your trip is ready");
    expect(html).toContain("Your itinerary is in your workspace now.");
    expect(html).toContain('data-testid="itinerary-applied-banner"');
    // The saved itinerary is also visible in the workspace — no blank state.
    expect(html).toContain("Lisbon Long Weekend");
  });

  it("does not render the banner when appliedSuccess is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(OverviewTab, {
        ...baseProps,
        appliedSuccess: false,
        savedItinerary: makeItinerary(),
      }),
    );

    expect(html).not.toContain("Your trip is ready");
    expect(html).not.toContain('data-testid="itinerary-applied-banner"');
    // The saved itinerary is still rendered (calm read view).
    expect(html).toContain("Lisbon Long Weekend");
  });

  it("does not render the banner while a draft is still pending", () => {
    // Apply belongs to the saved-state moment, not the draft editor.
    const html = renderToStaticMarkup(
      React.createElement(OverviewTab, {
        ...baseProps,
        appliedSuccess: true,
        savedItinerary: null,
        // A truthy pendingItinerary signals the user is still editing a draft.
        pendingItinerary: {
          title: "Draft",
          summary: "",
          days: [],
        } as unknown as React.ComponentProps<typeof OverviewTab>["pendingItinerary"],
      }),
    );

    expect(html).not.toContain("Your trip is ready");
    expect(html).not.toContain('data-testid="itinerary-applied-banner"');
  });
});

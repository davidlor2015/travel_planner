import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Trip } from "../../../../shared/api/trips";
import { OnTripHeader } from "./OnTripHeader";

const trip: Trip = {
  id: 1,
  title: "Luxury California Coastal Escape",
  destination: "Monterey",
  description: null,
  notes: null,
  start_date: "2026-04-22",
  end_date: "2026-04-25",
  user_id: 1,
  created_at: "2026-04-01T00:00:00Z",
  member_count: 1,
  members: [],
  pending_invites: [],
};

describe("OnTripHeader (render)", () => {
  it("renders the trip title and On-Trip breadcrumb", () => {
    const html = renderToStaticMarkup(
      React.createElement(OnTripHeader, {
        trip,
        readOnly: false,
        dayNumber: 2,
        dayDate: "2026-04-23",
        progressPct: 0,
        doneCount: 0,
        totalCount: 0,
      }),
    );
    expect(html).toContain("Luxury California Coastal Escape");
    expect(html).toContain("On-Trip");
    expect(html).toContain("Day 2");
  });

  it("renders the Read-only badge (with accessible label) and drops the old inline caption when readOnly", () => {
    const html = renderToStaticMarkup(
      React.createElement(OnTripHeader, {
        trip,
        readOnly: true,
        dayNumber: 1,
        dayDate: null,
        progressPct: 0,
        doneCount: 0,
        totalCount: 0,
      }),
    );
    expect(html).toContain("Read-only");
    expect(html).toContain('aria-label="Read-only mode: execution updates are disabled"');
    // The old hero-stack caption must be gone — users should not see two
    // competing statements of the read-only state.
    expect(html).not.toContain("execution updates are disabled.");
  });

  it("renders a single progress summary when there are stops", () => {
    const html = renderToStaticMarkup(
      React.createElement(OnTripHeader, {
        trip,
        readOnly: false,
        dayNumber: 1,
        dayDate: null,
        progressPct: 33,
        doneCount: 1,
        totalCount: 3,
      }),
    );
    // Exactly one "N of M done" should appear — header is the single source.
    const matches = html.match(/1 of 3 done/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("omits the progress summary when there are no stops", () => {
    const html = renderToStaticMarkup(
      React.createElement(OnTripHeader, {
        trip,
        readOnly: false,
        dayNumber: 1,
        dayDate: null,
        progressPct: 0,
        doneCount: 0,
        totalCount: 0,
      }),
    );
    expect(html).not.toContain("of 0 done");
  });
});

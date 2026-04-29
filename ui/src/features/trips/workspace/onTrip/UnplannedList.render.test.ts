// Path: ui/src/features/trips/workspace/onTrip/UnplannedList.render.test.ts
// Summary: Covers automated tests for UnplannedList.render.test behavior.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TripOnTripUnplannedStop } from "../../../../shared/api/trips";
import { UnplannedList } from "./UnplannedList";

const stop = (
  overrides: Partial<TripOnTripUnplannedStop & { isPending: boolean }> = {},
): TripOnTripUnplannedStop & { isPending: boolean } => ({
  event_id: 1,
  day_date: "2026-04-22",
  title: "Coffee at Barbini",
  time: "10:15",
  location: "Pebble Beach",
  notes: null,
  created_by_email: null,
  isPending: false,
  ...overrides,
});

describe("UnplannedList (render)", () => {
  it("renders the designed empty state with icon, copy, and an inline Log a stop trigger on desktop", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnplannedList, {
        stops: [],
        onRemove: () => {},
        onLogStop: () => {},
        isLoggingDisabled: false,
      }),
    );
    expect(html).toContain("Along the way");
    expect(html).toContain("Nothing logged yet");
    // Supporting copy gives the section intentional rhythm.
    expect(html).toContain("Capture a detour");
    // Exactly one Log-a-stop trigger — inside the empty card, not duplicated below.
    const logMatches = html.match(/Log a stop/g) ?? [];
    expect(logMatches.length).toBe(1);
    // Dashed empty-state card is present as a visual placeholder.
    expect(html).toContain("border-dashed");
  });

  it("does not render the empty-state card when there are stops, and shows one inline Log a stop below the list", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnplannedList, {
        stops: [stop()],
        onRemove: () => {},
        onLogStop: () => {},
        isLoggingDisabled: false,
      }),
    );
    expect(html).toContain("Along the way");
    expect(html).toContain("Coffee at Barbini");
    expect(html).not.toContain("Nothing logged yet");
    expect(html).not.toContain("border-dashed");
    const logMatches = html.match(/Log a stop/g) ?? [];
    expect(logMatches.length).toBe(1);
  });

  it("renders the empty state with no Log-a-stop button when onLogStop is omitted", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnplannedList, {
        stops: [],
        onRemove: () => {},
      }),
    );
    expect(html).toContain("Nothing logged yet");
    expect(html).not.toContain("Log a stop");
  });

  it("hides Log-a-stop CTA and per-row Remove buttons in read-only mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnplannedList, {
        stops: [stop(), stop({ event_id: 2, title: "Pastel de nata break" })],
        onRemove: () => {},
        onLogStop: () => {},
        isLoggingDisabled: false,
        readOnly: true,
      }),
    );
    // Rows still render — read-only is informational, not hidden.
    expect(html).toContain("Along the way");
    expect(html).toContain("Coffee at Barbini");
    expect(html).toContain("Pastel de nata break");
    // No execution affordances: no CTA, no Remove buttons.
    expect(html).not.toContain("Log a stop");
    expect(html).not.toMatch(/aria-label="Remove /);
  });
});

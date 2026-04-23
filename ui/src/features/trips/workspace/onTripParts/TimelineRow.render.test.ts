import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StopVM, TimelineRowVM } from "./types";
import { TimelineRow } from "./TimelineRow";

const stop = (overrides: Partial<StopVM> = {}): StopVM => ({
  day_number: 1,
  day_date: "2026-04-22",
  title: "Tram 28",
  time: "13:00",
  location: "Praca do Comercio",
  lat: null,
  lon: null,
  status: "planned",
  source: "day_date_exact",
  confidence: "high",
  stop_ref: "1",
  execution_status: null,
  key: "1",
  effectiveStatus: "planned",
  isPending: false,
  isReadOnly: false,
  ...overrides,
});

describe("TimelineRow (render)", () => {
  it("renders done variant with muted 'Done' label (no strike-through per Figma design)", () => {
    const row: TimelineRowVM = { variant: "done", stop: stop({ effectiveStatus: "confirmed" }) };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Tram 28");
    // Figma design: done rows show a "Done" state label, not a line-through
    expect(html).toContain("Done");
    expect(html).not.toContain("line-through");
  });

  it("renders now variant with 'Now' label and a halo marker (actions live in HappeningNowCard)", () => {
    const row: TimelineRowVM = {
      variant: "now",
      stop: stop(),
      pending: false,
      onNavigate: () => {},
      onConfirm: () => {},
      onSkip: () => {},
      onReset: () => {},
    };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Now");
    expect(html).toContain("Tram 28");
    // Now row carries a halo marker around the dot for stronger visual anchor.
    expect(html).toContain("data-now-halo");
    // Action buttons are intentionally in HappeningNowCard, not the inline timeline row
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Reset to planned");
  });

  it("renders next variant with mid-weight Confirm/Skip buttons and a Go navigate pill", () => {
    const row: TimelineRowVM = {
      variant: "next",
      stop: stop(),
      pending: false,
      onNavigate: () => {},
      onConfirm: () => {},
      onSkip: () => {},
    };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Next");
    expect(html).toContain("Tram 28");
    expect(html).toContain("Confirm");
    expect(html).toContain("Skip");
    expect(html).toContain("Go");
    // Confirm/Skip are real buttons (not ghost text links).
    // Expect two <button ... type="button"> occurrences inside the row.
    const buttonCount = (html.match(/<button[^>]*type="button"/g) ?? []).length;
    expect(buttonCount).toBeGreaterThanOrEqual(2);
  });


  it("renders upcoming without any action buttons", () => {
    const row: TimelineRowVM = { variant: "upcoming", stop: stop() };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Tram 28");
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Reset to planned");
  });

  it("omits Confirm / Skip in the next variant when the stop is read-only, but keeps the Go link", () => {
    const row: TimelineRowVM = {
      variant: "next",
      stop: stop({ isReadOnly: true }),
      pending: false,
      onNavigate: () => {},
      onConfirm: () => {},
      onSkip: () => {},
    };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Next");
    expect(html).toContain("Tram 28");
    // Go remains — navigation is always safe.
    expect(html).toContain("Go");
    // Execution controls are hidden outright, not disabled.
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Skip");
    expect(html).not.toContain('aria-label="Update status"');
  });
});

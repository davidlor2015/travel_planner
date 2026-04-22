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

  it("renders now variant with 'Now' label (actions live in HappeningNowCard, not the timeline row)", () => {
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
    // Action buttons are intentionally in HappeningNowCard, not the inline timeline row
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Reset to planned");
  });

  it("renders next variant with Confirm + Skip buttons and Go navigate link", () => {
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
  });

  it("renders upcoming without any action buttons", () => {
    const row: TimelineRowVM = { variant: "upcoming", stop: stop() };
    const html = renderToStaticMarkup(React.createElement(TimelineRow, { row }));
    expect(html).toContain("Tram 28");
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Reset to planned");
  });
});

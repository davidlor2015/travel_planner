import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StopVM } from "./types";
import { HappeningNowCard } from "./HappeningNowCard";

const stop: StopVM = {
  day_number: 1,
  day_date: "2026-04-22",
  title: "Breakfast",
  time: "09:00",
  location: "Alfama",
  lat: 38.711,
  lon: -9.129,
  status: "planned",
  source: "day_date_exact",
  confidence: "high",
  stop_ref: "99",
  execution_status: null,
  key: "99",
  effectiveStatus: "planned",
  isPending: false,
  isReadOnly: false,
};

describe("HappeningNowCard (render)", () => {
  it("renders 'Happening now' label, stop title, and primary actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(HappeningNowCard, {
        stop,
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      }),
    );
    // Label changed from "Now" to "Happening now" in the Figma redesign
    expect(html).toContain("Happening now");
    expect(html).toContain("Breakfast");
    expect(html).toContain("Confirm");
    expect(html).toContain("Skip");
  });

  it("renders Navigate link when coordinates are available", () => {
    const html = renderToStaticMarkup(
      React.createElement(HappeningNowCard, {
        stop,
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      }),
    );
    expect(html).toContain("Navigate");
    expect(html).toContain("href=");
  });

  it("renders location when present", () => {
    const html = renderToStaticMarkup(
      React.createElement(HappeningNowCard, {
        stop,
        onConfirm: () => {},
        onSkip: () => {},
        onReset: () => {},
      }),
    );
    expect(html).toContain("Alfama");
  });
});

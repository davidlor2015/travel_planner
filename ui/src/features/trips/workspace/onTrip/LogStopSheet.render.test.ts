// Path: ui/src/features/trips/workspace/onTrip/LogStopSheet.render.test.ts
// Summary: Covers automated tests for LogStopSheet.render.test behavior.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LogStopSheet } from "./LogStopSheet";

describe("LogStopSheet (render)", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(LogStopSheet, {
        open: false,
        disabled: false,
        defaultDate: "2026-04-22",
        onClose: () => {},
        onSubmit: async () => {},
      }),
    );
    expect(html).toBe("");
  });

  it("renders form fields when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(LogStopSheet, {
        open: true,
        disabled: false,
        defaultDate: "2026-04-22",
        onClose: () => {},
        onSubmit: async () => {},
      }),
    );
    expect(html).toContain("Log a stop");
    expect(html).toContain("Quick log");
    expect(html).toContain("Notes");
  });
});


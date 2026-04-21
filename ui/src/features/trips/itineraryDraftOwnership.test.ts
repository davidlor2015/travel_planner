import { describe, expect, it } from "vitest";

import {
  applyStopOwnershipMetadata,
  extractStopOwnershipMetadata,
} from "./itineraryDraft";

describe("itinerary draft ownership metadata", () => {
  it("extracts ownership token from notes and returns plain notes", () => {
    const parsed = extractStopOwnershipMetadata(
      "Buy tickets early.\n\n[ownership:handledBy=Alex;bookedBy=Sam]",
    );
    expect(parsed.metadata.handledBy).toBe("Alex");
    expect(parsed.metadata.bookedBy).toBe("Sam");
    expect(parsed.plainNotes).toBe("Buy tickets early.");
  });

  it("applies ownership metadata without losing plain notes", () => {
    const withOwnership = applyStopOwnershipMetadata("Main notes", {
      handledBy: "Alex",
      bookedBy: "Sam",
    });
    expect(withOwnership).toContain("Main notes");
    expect(withOwnership).toContain("[ownership:handledBy=Alex;bookedBy=Sam]");
  });

  it("removes ownership token when ownership values are cleared", () => {
    const noOwnership = applyStopOwnershipMetadata("Main notes", {
      handledBy: null,
      bookedBy: null,
    });
    expect(noOwnership).toBe("Main notes");
  });
});

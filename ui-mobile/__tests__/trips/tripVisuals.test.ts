import {
  getTripImageUrl,
  normalizeDestination,
} from "@/features/trips/workspace/helpers/tripVisuals";

// Stable Unsplash IDs that live in the catalog — brittle if the catalog changes,
// but that's intentional: a change to the catalog should require updating these.
const SACRAMENTO_IMAGE = "photo-1583132377145-497806a7fcff";
const JAPAN_IMAGE = "photo-1540959733332-eab4deabeeaf";
const FALLBACK_IDS = [
  "photo-1501785888041-af3ef285b470",
  "photo-1507525428034-b723cf961d3e",
  "photo-1500530855697-b586d89ba3ee",
  "photo-1467269204594-9661b134dd2b",
];

describe("normalizeDestination", () => {
  it.each([
    ["Sacramento, CA", "sacramento ca"],
    ["Sacramento, California", "sacramento california"],
    ["  SACRAMENTO ,  CA  ", "sacramento ca"],
    ["Sacramento,CA", "sacramento ca"],
    ["Sacramento", "sacramento"],
    ["Tokyo, Japan", "tokyo japan"],
    ["New York", "new york"],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeDestination(input)).toBe(expected);
  });
});

describe("getTripImageUrl", () => {
  describe("tier 1 — explicit heroImageUrl", () => {
    it("returns heroImageUrl when provided, ignoring destination", () => {
      const url = "https://example.com/custom-hero.jpg";
      const result = getTripImageUrl({
        id: 1,
        destination: "Tokyo, Japan",
        heroImageUrl: url,
      });
      expect(result).toBe(url);
    });

    it("falls through when heroImageUrl is null", () => {
      const result = getTripImageUrl({
        id: 1,
        destination: "Tokyo, Japan",
        heroImageUrl: null,
      });
      expect(result).toContain(JAPAN_IMAGE);
    });

    it("falls through when heroImageUrl is undefined", () => {
      const result = getTripImageUrl({ id: 1, destination: "Tokyo, Japan" });
      expect(result).toContain(JAPAN_IMAGE);
    });
  });

  describe("tier 2 — destination catalog match", () => {
    it("matches Tokyo, Japan", () => {
      const result = getTripImageUrl({ id: 1, destination: "Tokyo, Japan" });
      expect(result).toContain(JAPAN_IMAGE);
    });

    it("matches Kyoto from the Japan catalog entry", () => {
      const result = getTripImageUrl({ id: 1, destination: "Kyoto, Japan" });
      expect(result).toContain(JAPAN_IMAGE);
    });

    it("matches Sacramento, CA (city + state abbreviation)", () => {
      const result = getTripImageUrl({ id: 1, destination: "Sacramento, CA" });
      expect(result).toContain(SACRAMENTO_IMAGE);
    });

    it("matches Sacramento, California (city + full state)", () => {
      const result = getTripImageUrl({
        id: 1,
        destination: "Sacramento, California",
      });
      expect(result).toContain(SACRAMENTO_IMAGE);
    });

    it("matches Sacramento alone (no state)", () => {
      const result = getTripImageUrl({ id: 1, destination: "Sacramento" });
      expect(result).toContain(SACRAMENTO_IMAGE);
    });

    it("matches Sacramento,CA without space after comma", () => {
      const result = getTripImageUrl({ id: 1, destination: "Sacramento,CA" });
      expect(result).toContain(SACRAMENTO_IMAGE);
    });

    it("matches SACRAMENTO in all-caps via normalization", () => {
      const result = getTripImageUrl({
        id: 1,
        destination: "SACRAMENTO, CA",
      });
      expect(result).toContain(SACRAMENTO_IMAGE);
    });

    it("Sacramento does not bleed into generic USA entry", () => {
      const sacResult = getTripImageUrl({
        id: 1,
        destination: "Sacramento, CA",
      });
      const sfResult = getTripImageUrl({
        id: 2,
        destination: "San Francisco, CA",
      });
      expect(sacResult).not.toBe(sfResult);
    });
  });

  describe("tier 3 — deterministic Waypoint fallback", () => {
    it("returns a fallback image for an unknown destination", () => {
      const result = getTripImageUrl({
        id: 1,
        destination: "Atlantis, Ocean",
      });
      const isFallback = FALLBACK_IDS.some((id) => result.includes(id));
      expect(isFallback).toBe(true);
    });

    it("selects fallback by trip id so the same trip always gets the same image", () => {
      const first = getTripImageUrl({ id: 7, destination: "Unknown City" });
      const second = getTripImageUrl({ id: 7, destination: "Unknown City" });
      expect(first).toBe(second);
    });

    it("different unknown trip ids map to potentially different fallbacks", () => {
      const results = new Set(
        [0, 1, 2, 3].map((id) =>
          getTripImageUrl({ id, destination: "Nowhere" }),
        ),
      );
      // With 4 fallback images and ids 0–3, all 4 slots should be covered.
      expect(results.size).toBe(4);
    });

    it("negative trip ids are handled safely", () => {
      expect(() =>
        getTripImageUrl({ id: -5, destination: "Nowhere" }),
      ).not.toThrow();
    });
  });
});

import { describe, expect, it } from "vitest";

import type { TripOnTripStopSnapshot } from "../../../../shared/api/trips";
import {
  deriveCurrentStop,
  parseTimeToMinutes,
  todayLocalISODate,
} from "./deriveCurrentStop";

const stop = (overrides: Partial<TripOnTripStopSnapshot> = {}): TripOnTripStopSnapshot => ({
  day_number: 1,
  day_date: "2026-04-22",
  title: "Stop",
  time: "09:00",
  location: "Somewhere",
  lat: null,
  lon: null,
  status: "planned",
  source: "day_date_exact",
  confidence: "high",
  stop_ref: "1",
  execution_status: null,
  ...overrides,
});

describe("parseTimeToMinutes", () => {
  it("parses 24h times", () => {
    expect(parseTimeToMinutes("09:00")).toBe(9 * 60);
    expect(parseTimeToMinutes("13:30")).toBe(13 * 60 + 30);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("parses 12h am/pm times", () => {
    expect(parseTimeToMinutes("9:00 am")).toBe(9 * 60);
    expect(parseTimeToMinutes("12:00 am")).toBe(0);
    expect(parseTimeToMinutes("12:00 pm")).toBe(12 * 60);
    expect(parseTimeToMinutes("1:30 PM")).toBe(13 * 60 + 30);
  });

  it("returns null for unparseable values", () => {
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("   ")).toBeNull();
    expect(parseTimeToMinutes("morning")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBe(25 * 60);
  });
});

describe("deriveCurrentStop", () => {
  it("returns null when there are no stops", () => {
    expect(deriveCurrentStop([], 10 * 60)).toBeNull();
  });

  it("returns null when nothing has started yet", () => {
    const stops = [
      stop({ stop_ref: "a", time: "09:00" }),
      stop({ stop_ref: "b", time: "13:00" }),
    ];
    expect(deriveCurrentStop(stops, 8 * 60)).toBeNull();
  });

  it("picks the stop whose start time is the latest at or before now", () => {
    const stops = [
      stop({ stop_ref: "a", time: "09:00" }),
      stop({ stop_ref: "b", time: "13:00" }),
      stop({ stop_ref: "c", time: "18:00" }),
    ];
    const result = deriveCurrentStop(stops, 14 * 60);
    expect(result?.stop_ref).toBe("b");
  });

  it("excludes stops that are confirmed or skipped", () => {
    const stops = [
      stop({ stop_ref: "a", time: "09:00", execution_status: "confirmed" }),
      stop({ stop_ref: "b", time: "11:00", execution_status: "skipped" }),
      stop({ stop_ref: "c", time: "12:00", execution_status: "planned" }),
    ];
    const result = deriveCurrentStop(stops, 13 * 60);
    expect(result?.stop_ref).toBe("c");
  });

  it("falls back to plan status when execution_status is null", () => {
    const stops = [
      stop({ stop_ref: "a", time: "09:00", status: "confirmed", execution_status: null }),
      stop({ stop_ref: "b", time: "10:00", status: "planned", execution_status: null }),
    ];
    const result = deriveCurrentStop(stops, 12 * 60);
    expect(result?.stop_ref).toBe("b");
  });

  it("excludes stops with unparseable time strings", () => {
    const stops = [
      stop({ stop_ref: "a", time: null }),
      stop({ stop_ref: "b", time: "not-a-time" }),
      stop({ stop_ref: "c", time: "10:00" }),
    ];
    const result = deriveCurrentStop(stops, 14 * 60);
    expect(result?.stop_ref).toBe("c");
  });

  it("returns null when every started stop is terminal", () => {
    const stops = [
      stop({ stop_ref: "a", time: "09:00", execution_status: "confirmed" }),
      stop({ stop_ref: "b", time: "11:00", execution_status: "skipped" }),
    ];
    expect(deriveCurrentStop(stops, 15 * 60)).toBeNull();
  });

  it("handles a stop whose start time equals now", () => {
    const stops = [stop({ stop_ref: "a", time: "09:00" })];
    expect(deriveCurrentStop(stops, 9 * 60)?.stop_ref).toBe("a");
  });
});

describe("todayLocalISODate", () => {
  it("formats YYYY-MM-DD in the injected local Date", () => {
    expect(todayLocalISODate(new Date(2026, 0, 1, 10, 0))).toBe("2026-01-01");
    expect(todayLocalISODate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
    expect(todayLocalISODate(new Date(2026, 3, 9, 7, 0))).toBe("2026-04-09");
  });
});

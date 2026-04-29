import { formatTripStopTime } from "@/features/trips/stopTime";

describe("formatTripStopTime", () => {
  it.each([
    ["09:00", "9:00 AM"],
    ["13:30", "1:30 PM"],
    ["09:00AM", "9:00 AM"],
    ["09:00 AM", "9:00 AM"],
    ["2026-07-10T16:30:00", "4:30 PM"],
    [null, "No time"],
    ["", "No time"],
  ])("formats %p as %p", (input, expected) => {
    expect(formatTripStopTime(input)).toBe(expected);
  });
});

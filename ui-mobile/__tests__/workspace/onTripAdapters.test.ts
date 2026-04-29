import { deriveOnTripViewModel } from "@/features/trips/onTrip/adapters";
import type {
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
} from "@/features/trips/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function buildStop(
  overrides: Partial<TripOnTripStopSnapshot> = {},
): TripOnTripStopSnapshot {
  return {
    day_number: 4,
    day_date: "2026-10-13",
    title: "Kinkaku-ji",
    time: "10:00",
    location: "Kyoto",
    notes: null,
    lat: null,
    lon: null,
    status: "planned",
    source: "day_date_exact",
    confidence: "high",
    stop_ref: "stop-day4-a",
    execution_status: null,
    ...overrides,
  };
}

function buildSnapshot(
  overrides: Partial<TripOnTripSnapshot> = {},
): TripOnTripSnapshot {
  const todayStop = buildStop();
  return {
    generated_at: "2026-10-13T00:00:00Z",
    mode: "active",
    read_only: false,
    today: {
      day_number: 4,
      day_date: "2026-10-13",
      title: null,
      time: null,
      location: null,
      notes: null,
      lat: null,
      lon: null,
      status: "planned",
      source: "day_date_exact",
      confidence: "high",
      stop_ref: null,
      execution_status: null,
    },
    today_stops: [todayStop],
    today_unplanned: [],
    next_stop: {
      day_number: null,
      day_date: null,
      title: null,
      time: null,
      location: null,
      notes: null,
      lat: null,
      lon: null,
      status: "planned",
      source: "none",
      confidence: "low",
      stop_ref: null,
      execution_status: null,
    },
    blockers: [],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deriveOnTripViewModel — cross-day guard", () => {
  it("does NOT surface a next_stop that belongs to a different day in the top card", () => {
    const day4Stop = buildStop({ stop_ref: "stop-day4-a", execution_status: "confirmed" });
    const day5Stop = buildStop({
      stop_ref: "stop-day5-a",
      day_number: 5,
      day_date: "2026-10-14",
      title: "Arashiyama",
      execution_status: null,
    });

    const snapshot = buildSnapshot({
      today_stops: [day4Stop],
      next_stop: day5Stop, // server points to tomorrow
    });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    expect(vm.now).toBeNull();
    expect(vm.next).toBeNull();
  });

  it("sets isDayComplete=true when next_stop is cross-day and all today stops are resolved", () => {
    const day4Stop = buildStop({ stop_ref: "stop-day4-a", execution_status: "confirmed" });
    const day5Stop = buildStop({
      stop_ref: "stop-day5-a",
      day_number: 5,
      day_date: "2026-10-14",
      title: "Arashiyama",
      execution_status: null,
    });

    const snapshot = buildSnapshot({
      today_stops: [day4Stop],
      next_stop: day5Stop,
    });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    expect(vm.isDayComplete).toBe(true);
  });

  it("uses a same-day next_stop normally", () => {
    const day4StopA = buildStop({ stop_ref: "stop-day4-a", execution_status: "confirmed" });
    const day4StopB = buildStop({
      stop_ref: "stop-day4-b",
      title: "Gion walk",
      time: "14:00",
      execution_status: null,
    });

    const snapshot = buildSnapshot({
      today_stops: [day4StopA, day4StopB],
      next_stop: day4StopB, // same day — should be honoured
    });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    expect(vm.next?.stop_ref).toBe("stop-day4-b");
    expect(vm.isDayComplete).toBe(false);
  });

  it("falls back to first unresolved today stop when next_stop is cross-day", () => {
    const day4StopA = buildStop({ stop_ref: "stop-day4-a", execution_status: "confirmed" });
    const day4StopB = buildStop({
      stop_ref: "stop-day4-b",
      title: "Gion walk",
      time: "14:00",
      execution_status: null,
    });
    const day5Stop = buildStop({
      stop_ref: "stop-day5-a",
      day_number: 5,
      day_date: "2026-10-14",
      title: "Arashiyama",
      execution_status: null,
    });

    const snapshot = buildSnapshot({
      today_stops: [day4StopA, day4StopB],
      next_stop: day5Stop,
    });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    // Should pick day4StopB (first unresolved in today), not day5Stop
    expect(vm.next?.stop_ref).toBe("stop-day4-b");
    expect(vm.isDayComplete).toBe(false);
  });

  it("isDayComplete is false when today has an unresolved stop", () => {
    const day4Stop = buildStop({ stop_ref: "stop-day4-a", execution_status: null });
    const snapshot = buildSnapshot({ today_stops: [day4Stop] });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    expect(vm.isDayComplete).toBe(false);
  });

  it("isDayComplete is false when today_stops is empty", () => {
    const snapshot = buildSnapshot({ today_stops: [] });

    const vm = deriveOnTripViewModel(snapshot, {}, {});

    expect(vm.isDayComplete).toBe(false);
  });
});

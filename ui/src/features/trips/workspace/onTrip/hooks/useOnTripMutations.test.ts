// Path: ui/src/features/trips/workspace/onTrip/hooks/useOnTripMutations.test.ts
// Summary: Provides useOnTripMutations.test hook behavior.

// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TripOnTripSnapshot,
  TripOnTripStopSnapshot,
} from "../../../../../shared/api/trips";

// All network interactions go through the exported API adapters. Mocking at
// the module boundary is the smallest surface that exercises the hook's own
// state machine (optimistic/pending/committed/rollback, queue ordering,
// idempotency key generation) without also testing fetch itself.
vi.mock("../../../../../shared/api/trips", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../../shared/api/trips")
  >("../../../../../shared/api/trips");
  return {
    ...actual,
    getTripOnTripSnapshot: vi.fn(),
    postStopStatus: vi.fn(),
    postUnplannedStop: vi.fn(),
    deleteExecutionEvent: vi.fn(),
  };
});

import {
  deleteExecutionEvent,
  getTripOnTripSnapshot,
  postStopStatus,
  postUnplannedStop,
} from "../../../../../shared/api/trips";
import { useOnTripMutations } from "./useOnTripMutations";

const mockGetSnapshot = getTripOnTripSnapshot as ReturnType<typeof vi.fn>;
const mockPostStopStatus = postStopStatus as ReturnType<typeof vi.fn>;
const mockPostUnplannedStop = postUnplannedStop as ReturnType<typeof vi.fn>;
const mockDeleteEvent = deleteExecutionEvent as ReturnType<typeof vi.fn>;

const stop = (
  overrides: Partial<TripOnTripStopSnapshot> = {},
): TripOnTripStopSnapshot => ({
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

const snapshotOf = (
  stops: TripOnTripStopSnapshot[],
  overrides: Partial<TripOnTripSnapshot> = {},
): TripOnTripSnapshot => ({
  trip_id: 42,
  tz: null,
  today: stops[0] ?? stop(),
  next_stop: stops[0] ?? stop(),
  today_stops: stops,
  today_unplanned: [],
  blockers: [],
  execution_status: "planned",
  read_only: false,
  ...overrides,
}) as unknown as TripOnTripSnapshot;

// Deferred promise helper — lets a test precisely control when a mocked POST
// resolves so we can observe intermediate state (pending override still up,
// queue ordering, etc.).
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useOnTripMutations", () => {
  beforeEach(() => {
    mockGetSnapshot.mockReset();
    mockPostStopStatus.mockReset();
    mockPostUnplannedStop.mockReset();
    mockDeleteEvent.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a pending override visible while the POST is in flight even if a refresh fires", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    const onSnapshotRefresh = vi.fn();
    // The hook's own `refreshSnapshot` returns the same pre-write snapshot;
    // the pending override must NOT be cleared before the POST settles.
    mockGetSnapshot.mockResolvedValue(initial);
    const post = deferred<unknown>();
    mockPostStopStatus.mockReturnValue(post.promise);

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot: initial,
        onSnapshotRefresh,
      }),
    );

    // Fire the tap — do not await; we want to observe the mid-flight state.
    let pending: Promise<void>;
    act(() => {
      pending = result.current.setStopStatus("a", "confirmed");
    });

    // Optimistic state is applied synchronously.
    expect(result.current.viewSnapshot?.today_stops[0].execution_status).toBe(
      "confirmed",
    );
    expect(result.current.statusPending["a"]).toBe(true);

    // Let the POST settle.
    await act(async () => {
      post.resolve({});
      await pending!;
    });

    expect(mockPostStopStatus).toHaveBeenCalledTimes(1);
  });

  it("clears a committed override when the server refresh confirms it", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    const afterServer = snapshotOf([
      stop({ stop_ref: "a", execution_status: "confirmed" }),
    ]);
    const onSnapshotRefresh = vi.fn();
    mockGetSnapshot.mockResolvedValue(afterServer);
    mockPostStopStatus.mockResolvedValue({});

    const { result, rerender } = renderHook(
      ({ snap }: { snap: TripOnTripSnapshot }) =>
        useOnTripMutations({
          token: "t",
          tripId: 42,
          snapshot: snap,
          onSnapshotRefresh: (next) => {
            onSnapshotRefresh(next);
            rerender({ snap: next });
          },
        }),
      { initialProps: { snap: initial } },
    );

    await act(async () => {
      await result.current.setStopStatus("a", "confirmed");
    });

    await waitFor(() => {
      expect(result.current.statusPending["a"]).toBeUndefined();
    });
    // Override entry was cleared (server agreed), and no error feedback was
    // raised because the commit path matched the server state.
    expect(result.current.feedback).toBeNull();
    expect(
      result.current.viewSnapshot?.today_stops[0].execution_status,
    ).toBe("confirmed");
  });

  it("raises error feedback when the server disagrees with a committed override", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    // Server ultimately reports the stop as still planned, even though the
    // client POSTed confirmed — another device may have reverted it.
    const afterServer = snapshotOf([
      stop({ stop_ref: "a", execution_status: null }),
    ]);
    mockGetSnapshot.mockResolvedValue(afterServer);
    mockPostStopStatus.mockResolvedValue({});

    const { result, rerender } = renderHook(
      ({ snap }: { snap: TripOnTripSnapshot }) =>
        useOnTripMutations({
          token: "t",
          tripId: 42,
          snapshot: snap,
          onSnapshotRefresh: (next) => rerender({ snap: next }),
        }),
      { initialProps: { snap: initial } },
    );

    await act(async () => {
      await result.current.setStopStatus("a", "confirmed");
    });

    await waitFor(() => {
      expect(result.current.feedback?.kind).toBe("error");
    });
    expect(result.current.feedback?.message).toMatch(/reverted/i);
    // Override was cleared even though the commit was reverted.
    expect(
      result.current.viewSnapshot?.today_stops[0].execution_status,
    ).toBeNull();
  });

  it("rolls back to the previous override when the POST fails", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    // After the first commit lands, the server snapshot reflects "confirmed"
    // so reconcile preserves the committed override. The second (failing)
    // tap must then roll back to that prior "confirmed" state instead of
    // dropping it.
    const afterConfirm = snapshotOf([
      stop({ stop_ref: "a", execution_status: "confirmed" }),
    ]);
    mockGetSnapshot.mockResolvedValue(afterConfirm);

    mockPostStopStatus
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("boom"));

    const { result, rerender } = renderHook(
      ({ snap }: { snap: TripOnTripSnapshot }) =>
        useOnTripMutations({
          token: "t",
          tripId: 42,
          snapshot: snap,
          onSnapshotRefresh: (next) => rerender({ snap: next }),
        }),
      { initialProps: { snap: initial } },
    );

    await act(async () => {
      await result.current.setStopStatus("a", "confirmed");
    });
    expect(
      result.current.viewSnapshot?.today_stops[0].execution_status,
    ).toBe("confirmed");

    await act(async () => {
      await result.current.setStopStatus("a", "skipped");
    });

    // Second attempt failed — viewable state must remain "confirmed" (via
    // either the restored committed override or the agreed-upon server
    // state; both mean the user does NOT see a revert to skipped/null).
    expect(
      result.current.viewSnapshot?.today_stops[0].execution_status,
    ).toBe("confirmed");
    expect(result.current.feedback?.kind).toBe("error");
  });

  it("serializes POSTs per stop_ref so rapid taps reach the server in submission order", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    mockGetSnapshot.mockResolvedValue(initial);

    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const callOrder: string[] = [];
    mockPostStopStatus.mockImplementation((_token, _tripId, payload) => {
      callOrder.push(payload.status);
      return callOrder.length === 1 ? first.promise : second.promise;
    });

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot: initial,
        onSnapshotRefresh: () => {},
      }),
    );

    let firstTap: Promise<void>;
    let secondTap: Promise<void>;
    await act(async () => {
      firstTap = result.current.setStopStatus("a", "confirmed");
      secondTap = result.current.setStopStatus("a", "skipped");
      // Drain microtasks so the first queued POST reaches the adapter. The
      // second must stay queued because `first` has not resolved yet.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPostStopStatus).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["confirmed"]);

    // Resolve the first POST; the queue must now release the second one.
    await act(async () => {
      first.resolve({});
      await firstTap!;
    });
    expect(mockPostStopStatus).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual(["confirmed", "skipped"]);

    // Drain the second POST so the test exits cleanly.
    await act(async () => {
      second.resolve({});
      await secondTap!;
    });
  });

  it("does not block a stop's own queue when a prior POST for the same ref fails", async () => {
    const initial = snapshotOf([stop({ stop_ref: "a" })]);
    mockGetSnapshot.mockResolvedValue(initial);
    mockPostStopStatus
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot: initial,
        onSnapshotRefresh: () => {},
      }),
    );

    await act(async () => {
      await result.current.setStopStatus("a", "confirmed");
    });
    await act(async () => {
      await result.current.setStopStatus("a", "skipped");
    });

    expect(mockPostStopStatus).toHaveBeenCalledTimes(2);
  });

  it("attaches a client_request_id to the unplanned-stop POST payload", async () => {
    const initial = snapshotOf([]);
    mockGetSnapshot.mockResolvedValue(initial);
    mockPostUnplannedStop.mockResolvedValue({});

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot: initial,
        onSnapshotRefresh: () => {},
      }),
    );

    await act(async () => {
      await result.current.logUnplannedStop({
        day_date: "2026-04-22",
        title: "Coffee",
      });
    });

    expect(mockPostUnplannedStop).toHaveBeenCalledTimes(1);
    const payload = mockPostUnplannedStop.mock.calls[0]![2];
    expect(typeof payload.client_request_id).toBe("string");
    expect(payload.client_request_id.length).toBeGreaterThan(0);
    expect(payload.title).toBe("Coffee");
  });

  it("preserves a caller-supplied client_request_id instead of overwriting it", async () => {
    const initial = snapshotOf([]);
    mockGetSnapshot.mockResolvedValue(initial);
    mockPostUnplannedStop.mockResolvedValue({});

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot: initial,
        onSnapshotRefresh: () => {},
      }),
    );

    await act(async () => {
      await result.current.logUnplannedStop({
        day_date: "2026-04-22",
        title: "Coffee",
        client_request_id: "explicit-rid",
      });
    });

    const payload = mockPostUnplannedStop.mock.calls[0]![2];
    expect(payload.client_request_id).toBe("explicit-rid");
  });

  it("keeps the optimistic delete in place when the adapter resolves (404-tolerant on retry)", async () => {
    const snapshot = snapshotOf([], {
      today_unplanned: [
        {
          event_id: 7,
          day_date: "2026-04-22",
          title: "Detour",
          time: null,
          location: null,
          notes: null,
          created_by_email: null,
        },
      ],
    } as Partial<TripOnTripSnapshot>);
    mockGetSnapshot.mockResolvedValue(snapshot);
    // The adapter's `treat404AsSuccess` flag is tested at the boundary
    // layer; from the hook's perspective a 404 on retry is simply a resolved
    // delete. Simulate that: the adapter resolves, and the optimistic
    // removal must therefore stick — no rollback, no error feedback.
    mockDeleteEvent.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot,
        onSnapshotRefresh: () => {},
      }),
    );

    expect(result.current.viewSnapshot?.today_unplanned.length).toBe(1);

    await act(async () => {
      await result.current.removeUnplannedStop(7);
    });

    expect(result.current.viewSnapshot?.today_unplanned.length).toBe(0);
    expect(result.current.feedback).toBeNull();
  });

  it("rolls back the optimistic delete when the adapter rejects", async () => {
    const snapshot = snapshotOf([], {
      today_unplanned: [
        {
          event_id: 7,
          day_date: "2026-04-22",
          title: "Detour",
          time: null,
          location: null,
          notes: null,
          created_by_email: null,
        },
      ],
    } as Partial<TripOnTripSnapshot>);
    mockGetSnapshot.mockResolvedValue(snapshot);
    mockDeleteEvent.mockRejectedValue(new Error("down"));

    const { result } = renderHook(() =>
      useOnTripMutations({
        token: "t",
        tripId: 42,
        snapshot,
        onSnapshotRefresh: () => {},
      }),
    );

    await act(async () => {
      await result.current.removeUnplannedStop(7);
    });

    // Optimistic delete was reverted (row is visible again) and the user is
    // told the delete failed. This is the critical negative case that
    // `treat404AsSuccess` must NOT interfere with.
    expect(result.current.viewSnapshot?.today_unplanned.length).toBe(1);
    expect(result.current.feedback?.kind).toBe("error");
  });
});

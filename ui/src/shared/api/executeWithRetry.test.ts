import { describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { executeWithRetry } from "./executeWithRetry";

const makeResponse = (status: number, body = ""): Response =>
  new Response(body, { status, statusText: `${status}` });

// `executeWithRetry` waits 500ms between attempts. Tests that exercise the
// retry path run against the real clock — the alternative (fake timers) has
// brittle interactions with `vitest@4` when the code under test mixes
// microtasks and `setTimeout`. 500ms per retry is a fine price for keeping
// the production timing exactly as shipped.

describe("executeWithRetry", () => {
  it("returns the response when the first attempt succeeds", async () => {
    const perform = vi.fn().mockResolvedValue(makeResponse(200, "ok"));
    const result = await executeWithRetry(perform, "do thing");
    expect(perform).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it("retries once on a 5xx and returns the retried success", async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(503, "down"))
      .mockResolvedValueOnce(makeResponse(200, "ok"));
    const result = await executeWithRetry(perform, "do thing");
    expect(perform).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it("does not retry on a 4xx and surfaces an ApiError", async () => {
    const perform = vi.fn().mockResolvedValue(makeResponse(400, "bad"));
    await expect(executeWithRetry(perform, "do thing")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it("retries once on a network error and returns the retried success", async () => {
    const perform = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("NetworkError"))
      .mockResolvedValueOnce(makeResponse(200, "ok"));
    const result = await executeWithRetry(perform, "do thing");
    expect(perform).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it("throws when both attempts fail with 5xx", async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(500));
    await expect(
      executeWithRetry(perform, "do thing"),
    ).rejects.toBeInstanceOf(ApiError);
    expect(perform).toHaveBeenCalledTimes(2);
  });

  it("treats a 404 as success when treat404AsSuccess is set (idempotent DELETE)", async () => {
    const perform = vi.fn().mockResolvedValue(makeResponse(404, ""));
    const result = await executeWithRetry(perform, "delete thing", {
      treat404AsSuccess: true,
    });
    expect(perform).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(404);
  });

  it("does NOT treat a 404 as success without the flag", async () => {
    const perform = vi.fn().mockResolvedValue(makeResponse(404, ""));
    await expect(
      executeWithRetry(perform, "delete thing"),
    ).rejects.toBeInstanceOf(ApiError);
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it("still retries on 5xx when treat404AsSuccess is set, and resolves a DELETE 404 on retry", async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(404));
    const result = await executeWithRetry(perform, "delete thing", {
      treat404AsSuccess: true,
    });
    expect(perform).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(404);
  });
});

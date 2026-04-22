import { ApiError } from './errors';

/**
 * Retry options for a single execution.
 *
 * Kept small and focused — one switch per semantic we actually need. When you
 * feel the urge to add a third option, consider whether the operation belongs
 * in its own adapter instead.
 */
export interface RetryOptions {
  /**
   * DELETE requests are idempotent by HTTP contract. If a first DELETE
   * succeeded server-side but the response was dropped on the wire, the
   * caller's retry will see a 404 — the row is already gone. From the
   * caller's point of view that is the desired end state, so treat it as
   * success instead of propagating a user-visible "could not remove" error.
   *
   * This flag must only be set on genuinely idempotent operations. POSTs that
   * create new rows keep their default strict behaviour.
   */
  treat404AsSuccess?: boolean;
}

/**
 * Run an execution-log request and retry once (500ms backoff) on transient
 * failures. A transient failure is either a network error (fetch itself
 * throws) or a 5xx response from the server. 4xx responses are user-facing
 * errors that would never succeed on retry, so they surface immediately.
 *
 * Callers that rollback optimistic UI should only do so after this helper
 * rejects, which means both attempts failed.
 */
export async function executeWithRetry(
  perform: () => Promise<Response>,
  label: string,
  options: RetryOptions = {},
): Promise<Response> {
  type Outcome =
    | { ok: true; response: Response }
    | { ok: false; retryable: boolean; error: Error };

  const runOnce = async (): Promise<Outcome> => {
    let response: Response;
    try {
      response = await perform();
    } catch (err) {
      return {
        ok: false,
        retryable: true,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
    if (response.ok) return { ok: true, response };
    if (options.treat404AsSuccess && response.status === 404) {
      return { ok: true, response };
    }
    const retryable = response.status >= 500;
    const apiErr = await ApiError.fromResponse(response, `Failed to ${label}`);
    return { ok: false, retryable, error: apiErr };
  };

  const first = await runOnce();
  if (first.ok) return first.response;
  if (!first.retryable) throw first.error;
  await new Promise((resolve) => setTimeout(resolve, 500));
  const second = await runOnce();
  if (second.ok) return second.response;
  throw second.error;
}

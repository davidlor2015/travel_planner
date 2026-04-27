// Path: ui-mobile/shared/api/executeWithRetry.ts
// Summary: Implements executeWithRetry module logic.

import { ApiError } from "./client";

export interface RetryOptions {
  /**
   * DELETE is idempotent — a 404 on retry means the row is already gone,
   * which is the desired end state. Only set this on genuinely idempotent ops.
   */
  treat404AsSuccess?: boolean;
}

/**
 * Run a request and retry once (500ms backoff) on transient failures.
 * Transient = network error or 5xx. 4xx surfaces immediately.
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

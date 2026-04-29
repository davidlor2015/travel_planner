// Path: ui/src/shared/api/errors.ts
// Summary: Implements errors module logic.

/**
 * Structured error thrown by all API client modules when a request receives
 * a non-OK HTTP response. Carries the status code and raw response body so
 * callers can branch on status without parsing the message string, and the UI
 * can render consistent copy regardless of which module threw.
 *
 * Usage:
 *   throw await ApiError.fromResponse(response, 'Failed to load budget');
 *
 *   catch (err) {
 *     if (err instanceof ApiError && err.status === 404) { ... }
 *   }
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /**
   * Read the response body and construct an ApiError with a consistent
   * message format: "<label> (<status>)[: <body>]".
   */
  static async fromResponse(response: Response, label: string): Promise<ApiError> {
    const body = await response.text().catch(() => '');
    const trimmed = body.trim();
    const message = trimmed ? `${label} (${response.status}): ${trimmed}` : `${label} (${response.status})`;
    return new ApiError(message, response.status, body);
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

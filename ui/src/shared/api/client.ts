import { API_URL } from '../../app/config';
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeSession,
} from '../auth/session';

interface SessionTokenResponse {
  access_token: string;
  refresh_token: string;
}

type ApiFetchInit = RequestInit & {
  token?: string;
  retryOnAuthError?: boolean;
  /**
   * Client-side timeout in milliseconds. Defaults to
   * `DEFAULT_API_TIMEOUT_MS`. Pass `0` or a negative value to disable the
   * timeout (e.g. long-running SSE streams). A caller-provided `signal`
   * is respected and composed with the timeout signal.
   */
  timeoutMs?: number;
};

export const DEFAULT_API_TIMEOUT_MS = 45_000;

let refreshPromise: Promise<string | null> | null = null;

function withAuthorization(headers: HeadersInit | undefined, accessToken: string | null): Headers {
  const next = new Headers(headers);
  if (accessToken) {
    next.set('Authorization', `Bearer ${accessToken}`);
  }
  return next;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredSession();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const data: SessionTokenResponse = await response.json();
    storeSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Composes any caller-provided AbortSignal with a timeout-driven signal so a
 * silent server stall surfaces as an error the UI can react to instead of an
 * indefinite spinner. Returns the composite signal and a cleanup function
 * that clears the timer.
 */
function withTimeoutSignal(
  existingSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  if (timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
    return {
      signal: existingSignal ?? new AbortController().signal,
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  let unsubscribe: (() => void) | null = null;
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort(existingSignal.reason);
    } else {
      const onAbort = () => controller.abort(existingSignal.reason);
      existingSignal.addEventListener('abort', onAbort, { once: true });
      unsubscribe = () => existingSignal.removeEventListener('abort', onAbort);
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      unsubscribe?.();
    },
  };
}

export async function apiFetch(input: string, init: ApiFetchInit = {}): Promise<Response> {
  const {
    token,
    retryOnAuthError = true,
    headers,
    signal,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    ...rest
  } = init;

  const { signal: timeoutSignal, cleanup } = withTimeoutSignal(signal, timeoutMs);

  const makeRequest = (accessToken: string | null) =>
    fetch(input, {
      ...rest,
      headers: withAuthorization(headers, accessToken),
      signal: timeoutSignal,
    });

  try {
    const initialToken = getStoredAccessToken() ?? token ?? null;
    const response = await makeRequest(initialToken);

    if (response.status !== 401 || !retryOnAuthError) {
      return response;
    }

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      return response;
    }

    return await makeRequest(refreshedToken);
  } finally {
    cleanup();
  }
}

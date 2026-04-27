// Path: ui-mobile/shared/api/client.ts
// Summary: Implements client module logic.

import { API_BASE_URL } from "@/shared/api/config";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setSessionTokens,
} from "@/shared/auth/tokenStorage";

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  static async fromResponse(response: Response, label: string): Promise<ApiError> {
    const body = await response.text().catch(() => "");
    const trimmed = body.trim();
    const message = trimmed
      ? `${label} (${response.status}): ${trimmed}`
      : `${label} (${response.status})`;
    return new ApiError(response.status, message, trimmed || undefined);
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

interface SessionTokenResponse {
  access_token: string;
  refresh_token: string;
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  authToken?: string | null;
  skipAuth?: boolean;
  timeoutMs?: number;
};

export const DEFAULT_API_TIMEOUT_MS = 45_000;

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Check must happen before any await so concurrent 401 responses share
  // one refresh call. If the check came after await getRefreshToken(), two
  // callers could both read null and issue parallel refreshes — the second
  // would fail because the first already consumed the refresh token.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearSessionTokens();
        return null;
      }
      const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        await clearSessionTokens();
        return null;
      }
      const data: SessionTokenResponse = await response.json();
      await setSessionTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      return data.access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string): string {
  return path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer
  );
}

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
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  let unsubscribe: (() => void) | null = null;
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort(existingSignal.reason);
    } else {
      const onAbort = () => controller.abort(existingSignal.reason);
      existingSignal.addEventListener("abort", onAbort, { once: true });
      unsubscribe = () => existingSignal.removeEventListener("abort", onAbort);
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

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const {
    headers,
    body,
    authToken,
    skipAuth = false,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    signal,
    method = "GET",
    ...rest
  } = options;

  const { signal: timeoutSignal, cleanup } = withTimeoutSignal(signal, timeoutMs);

  const resolvedHeaders = new Headers(headers);

  const initialToken = skipAuth
    ? null
    : (authToken ?? (await getAccessToken()) ?? null);
  if (initialToken) resolvedHeaders.set("Authorization", `Bearer ${initialToken}`);

  let resolvedBody: BodyInit | undefined;
  if (body != null) {
    if (isBodyInit(body)) {
      resolvedBody = body;
    } else {
      if (!resolvedHeaders.has("Content-Type")) {
        resolvedHeaders.set("Content-Type", "application/json");
      }
      resolvedBody = JSON.stringify(body);
    }
  }

  const makeRequest = (accessToken: string | null): Promise<Response> => {
    const hdrs = new Headers(resolvedHeaders);
    if (accessToken) {
      hdrs.set("Authorization", `Bearer ${accessToken}`);
    } else {
      hdrs.delete("Authorization");
    }
    return fetch(buildUrl(path), {
      ...rest,
      method,
      headers: hdrs,
      body: resolvedBody,
      signal: timeoutSignal,
    });
  };

  try {
    const response = await makeRequest(initialToken);

    if (response.status !== 401 || skipAuth) {
      return response;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) return response;

    return makeRequest(refreshed);
  } finally {
    cleanup();
  }
}

async function readErrorPayload(response: Response): Promise<{
  detail?: string;
  message: string;
}> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: unknown; message?: unknown }
      | null;

    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : Array.isArray(payload?.detail)
          ? (payload.detail as unknown[])
              .map((issue) => {
                if (
                  typeof issue === "object" &&
                  issue &&
                  "loc" in issue &&
                  "msg" in issue
                ) {
                  const loc = (issue as { loc: unknown[] }).loc;
                  const location =
                    Array.isArray(loc) && loc.length > 0
                      ? String(loc.join("."))
                      : "request";
                  const msg = (issue as { msg?: unknown }).msg;
                  return `${location}: ${typeof msg === "string" ? msg : "invalid"}`;
                }
                return null;
              })
              .filter((v): v is string => Boolean(v))
              .join("; ") || undefined
          : undefined;

    const messageFromPayload =
      typeof payload?.message === "string" ? payload.message : undefined;

    return {
      detail,
      message: detail ?? messageFromPayload ?? `Request failed (${response.status})`,
    };
  }

  const text = await response.text().catch(() => "");
  return { message: text || `Request failed (${response.status})` };
}

export async function apiRequest<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const { message, detail } = await readErrorPayload(response);
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

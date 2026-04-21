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
};

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

export async function apiFetch(input: string, init: ApiFetchInit = {}): Promise<Response> {
  const { token, retryOnAuthError = true, headers, ...rest } = init;

  const makeRequest = (accessToken: string | null) =>
    fetch(input, {
      ...rest,
      headers: withAuthorization(headers, accessToken),
    });

  const initialToken = getStoredAccessToken() ?? token ?? null;
  const response = await makeRequest(initialToken);

  if (response.status !== 401 || !retryOnAuthError) {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    return response;
  }

  return makeRequest(refreshedToken);
}

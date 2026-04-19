export interface SessionUser {
  email: string;
  id?: number;
  email_verified?: boolean;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'waypoint_user';
export const SESSION_EVENT = 'waypoint-session-updated';
export const SESSION_CLEARED_EVENT = 'waypoint-session-cleared';

function isSessionUser(value: unknown): value is SessionUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).email === 'string'
  );
}

export function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSessionUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeSession(tokens: SessionTokens, user?: SessionUser | null): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function storeSessionUser(user: SessionUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearStoredSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
}

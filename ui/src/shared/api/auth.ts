import { API_URL } from '../../app/config';
import type { SessionUser } from '../auth/session';
import { apiFetch } from './client';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
}

export type UserProfile = SessionUser;

export interface PasswordResetRequestResponse {
  ok: boolean;
  reset_url: string | null;
}

export interface PasswordResetTokenStatus {
  valid: boolean;
  email: string | null;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

export const refreshSession = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }

  return response.json();
};

export const register = async (email: string, password: string): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }
  return response.json();
};

export const getMe = async (token?: string): Promise<UserProfile> => {
  const response = await apiFetch(`${API_URL}/v1/auth/me`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch user profile (${response.status}): ${text}`);
  }

  return response.json();
};

export const requestPasswordReset = async (email: string): Promise<PasswordResetRequestResponse> => {
  const response = await fetch(`${API_URL}/v1/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error('Password reset request failed');
  }

  return response.json();
};

export const validatePasswordResetToken = async (token: string): Promise<PasswordResetTokenStatus> => {
  const response = await fetch(`${API_URL}/v1/auth/password-reset/validate?token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error('Password reset token validation failed');
  }
  return response.json();
};

export const confirmPasswordReset = async (token: string, password: string): Promise<void> => {
  const response = await fetch(`${API_URL}/v1/auth/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Password reset failed (${response.status}): ${text}`);
  }
};

// Path: ui/src/shared/api/auth.ts
// Summary: Implements auth module logic.

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

export interface EmailVerificationRequestResponse {
  ok: boolean;
  verification_url: string | null;
}

export interface PasswordResetTokenStatus {
  valid: boolean;
  email: string | null;
}

export interface EmailVerificationTokenStatus {
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
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? 'Login failed');
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
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? 'Registration failed');
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

export const requestEmailVerification = async (email: string): Promise<EmailVerificationRequestResponse> => {
  const response = await fetch(`${API_URL}/v1/auth/email-verification/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error('Email verification request failed');
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

export const validateEmailVerificationToken = async (token: string): Promise<EmailVerificationTokenStatus> => {
  const response = await fetch(`${API_URL}/v1/auth/email-verification/validate?token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error('Email verification token validation failed');
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

export const confirmEmailVerification = async (token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/v1/auth/email-verification/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email verification failed (${response.status}): ${text}`);
  }
};

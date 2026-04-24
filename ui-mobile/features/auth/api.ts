import { API_BASE_URL } from "@/shared/api/config";
import { ApiError, apiRequest } from "@/shared/api/client";

import type { LoginRequest, LoginResponse, MeResponse } from "./types";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const body = `username=${encodeURIComponent(payload.email)}&password=${encodeURIComponent(payload.password)}`;
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json().catch(() => null)) as
        | { detail?: unknown; message?: unknown }
        | null;
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : typeof data?.message === "string"
            ? data.message
            : undefined;
      throw new ApiError(
        response.status,
        detail ?? `Request failed (${response.status})`,
        detail,
      );
    }
    const text = await response.text().catch(() => "");
    throw new ApiError(
      response.status,
      text || `Request failed (${response.status})`,
      text || undefined,
    );
  }

  return (await response.json()) as LoginResponse;
}

export async function register(
  email: string,
  password: string,
): Promise<MeResponse> {
  return apiRequest<MeResponse>("/v1/auth/register", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });
}

export async function getMe(accessToken?: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/v1/auth/me", {
    method: "GET",
    authToken: accessToken,
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest<void>("/v1/auth/password-reset/request", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  await apiRequest<void>("/v1/auth/password-reset/confirm", {
    method: "POST",
    body: { token, password },
    skipAuth: true,
  });
}

export async function validatePasswordResetToken(
  token: string,
): Promise<{ valid: boolean; email: string | null }> {
  return apiRequest<{ valid: boolean; email: string | null }>(
    `/v1/auth/password-reset/validate?token=${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

export async function requestEmailVerification(email: string): Promise<void> {
  await apiRequest<void>("/v1/auth/email-verification/request", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
}

export async function confirmEmailVerification(token: string): Promise<void> {
  await apiRequest<void>("/v1/auth/email-verification/confirm", {
    method: "POST",
    body: { token },
    skipAuth: true,
  });
}

export async function validateEmailVerificationToken(
  token: string,
): Promise<{ valid: boolean; email: string | null }> {
  return apiRequest<{ valid: boolean; email: string | null }>(
    `/v1/auth/email-verification/validate?token=${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

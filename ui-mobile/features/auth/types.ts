// Path: ui-mobile/features/auth/types.ts
// Summary: Implements types module logic.

import type { SessionTokens } from "@/shared/auth/tokenStorage";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
};

export type EmailVerificationRequestResponse = {
  ok: boolean;
  verification_url: string | null;
};

export type MeResponse = {
  id: number;
  email: string;
  display_name: string | null;
  is_active: boolean;
  email_verified: boolean;
};

export type AuthStatus =
  | "hydrating"
  | "provisional"
  | "authenticated"
  | "unauthenticated";

export type AuthSession = {
  tokens: SessionTokens;
  user: MeResponse;
};

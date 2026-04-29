// Path: ui-mobile/features/auth/hooks.ts
// Summary: Implements hooks module logic.

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  confirmEmailVerification,
  confirmPasswordReset,
  getMe,
  login,
  register,
  requestEmailVerification,
  requestPasswordReset,
  updateMe,
} from "./api";
import type { LoginRequest } from "./types";

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      display_name: string;
    }) => register(payload),
  });
}

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
}

export function useConfirmPasswordResetMutation() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      confirmPasswordReset(token, password),
  });
}

export function useRequestEmailVerificationMutation() {
  return useMutation({
    mutationFn: (email: string) => requestEmailVerification(email),
  });
}

export function useConfirmEmailVerificationMutation() {
  return useMutation({
    mutationFn: (token: string) => confirmEmailVerification(token),
  });
}

export function useUpdateMeMutation() {
  return useMutation({
    mutationFn: (payload: { display_name: string }) => updateMe(payload),
  });
}

export function useValidateSessionQuery(options: {
  accessToken: string | null;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["auth", "me", options.accessToken],
    queryFn: () => getMe(options.accessToken ?? undefined),
    enabled: options.enabled && Boolean(options.accessToken),
    retry: false,
    staleTime: 30_000,
  });
}

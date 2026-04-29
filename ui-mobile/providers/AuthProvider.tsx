// Path: ui-mobile/providers/AuthProvider.tsx
// Summary: Implements AuthProvider module logic.

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getMe } from "@/features/auth/api";
import {
  useLoginMutation,
  useValidateSessionQuery,
} from "@/features/auth/hooks";
import type {
  AuthStatus,
  LoginRequest,
  MeResponse,
} from "@/features/auth/types";
import {
  clearSessionTokens,
  getSessionTokens,
  setSessionTokens,
  subscribeSessionTokens,
} from "@/shared/auth/tokenStorage";

type AuthContextValue = {
  isHydrating: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  accessToken: string | null;
  user: MeResponse | null;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("hydrating");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);

  const validateSessionQuery = useValidateSessionQuery({
    accessToken,
    enabled: authStatus === "provisional" && Boolean(accessToken),
  });

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const tokens = await getSessionTokens();
        if (!isMounted) {
          return;
        }

        if (!tokens?.accessToken) {
          setAuthStatus("unauthenticated");
          return;
        }

        setAccessToken(tokens.accessToken);
        setAuthStatus("provisional");
      } catch {
        if (isMounted) {
          setAuthStatus("unauthenticated");
        }
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSessionTokens((tokens) => {
      if (!tokens) {
        setAccessToken(null);
        setUser(null);
        setAuthStatus("unauthenticated");
        return;
      }

      setAccessToken(tokens.accessToken);
      setAuthStatus((current) =>
        current === "authenticated" ? current : "provisional",
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authStatus !== "provisional") {
      return;
    }

    if (!accessToken) {
      setAuthStatus("unauthenticated");
      return;
    }

    if (validateSessionQuery.isSuccess) {
      setUser(validateSessionQuery.data);
      setAuthStatus("authenticated");
      return;
    }

    if (validateSessionQuery.isError) {
      void clearSessionTokens();
    }
  }, [
    accessToken,
    authStatus,
    validateSessionQuery.data,
    validateSessionQuery.isError,
    validateSessionQuery.isSuccess,
  ]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrating:
        authStatus === "hydrating" ||
        authStatus === "provisional" ||
        loginMutation.isPending,
      isAuthenticated: authStatus === "authenticated",
      authStatus,
      accessToken,
      user,
      signIn: async (credentials: LoginRequest) => {
        const session = await loginMutation.mutateAsync(credentials);

        await setSessionTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });

        try {
          const me = await getMe(session.access_token);
          setUser(me);
          setAuthStatus("authenticated");
        } catch (error) {
          await clearSessionTokens();
          throw error;
        }
      },
      signOut: async () => {
        await clearSessionTokens();
        queryClient.removeQueries({ queryKey: ["trips"] });
        queryClient.removeQueries({ queryKey: ["auth", "me"] });
      },
      refreshUser: async () => {
        const me = await getMe();
        setUser(me);
      },
    }),
    [accessToken, authStatus, loginMutation, queryClient, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

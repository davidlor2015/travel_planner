// Path: ui-mobile/shared/auth/tokenStorage.ts
// Summary: Implements tokenStorage module logic.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "roen.accessToken";
const REFRESH_TOKEN_KEY = "roen.refreshToken";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type SessionTokensListener = (tokens: SessionTokens | null) => void;

const listeners = new Set<SessionTokensListener>();

function emitTokensChanged(tokens: SessionTokens | null) {
  listeners.forEach((listener) => {
    listener(tokens);
  });
}

export function subscribeSessionTokens(
  listener: SessionTokensListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function setSessionTokens(tokens: SessionTokens): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);

  emitTokensChanged(tokens);
}

export async function clearSessionTokens(): Promise<void> {
  await Promise.all([removeItem(ACCESS_TOKEN_KEY), removeItem(REFRESH_TOKEN_KEY)]);

  emitTokensChanged(null);
}

// Path: ui-mobile/shared/api/config.ts
// Summary: Implements config module logic.

import { Platform } from "react-native";

const DEFAULT_WEB_DEV_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:8000";
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function resolveConfiguredBaseUrl(): string | null {
  const primary = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (primary) {
    return primary;
  }

  const legacyAlias = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (legacyAlias) {
    return legacyAlias;
  }

  return null;
}

function remapAndroidLocalhost(baseUrl: string): string {
  if (Platform.OS !== "android") {
    return baseUrl;
  }

  try {
    const parsed = new URL(baseUrl);
    if (!LOCALHOST_HOSTS.has(parsed.hostname)) {
      return baseUrl;
    }
    parsed.hostname = "10.0.2.2";
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}

function resolveApiBaseUrl(): string {
  const raw = resolveConfiguredBaseUrl();
  if (raw) {
    return normalizeBaseUrl(remapAndroidLocalhost(raw));
  }

  if (process.env.NODE_ENV === "test") {
    return DEFAULT_WEB_DEV_API_BASE_URL;
  }

  const isDev =
    typeof __DEV__ === "boolean"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  if (Platform.OS === "web" && isDev) {
    return DEFAULT_WEB_DEV_API_BASE_URL;
  }

  if (Platform.OS === "android" && isDev) {
    return DEFAULT_ANDROID_EMULATOR_API_BASE_URL;
  }

  throw new Error(
    "Missing EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_API_URL). Set it in ui-mobile/.env for native app development.",
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

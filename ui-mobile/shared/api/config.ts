// Path: ui-mobile/shared/api/config.ts
// Summary: Implements config module logic.

import { Platform } from "react-native";

const DEFAULT_WEB_DEV_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function resolveApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (raw) {
    return normalizeBaseUrl(raw);
  }

  const isDev =
    typeof __DEV__ === "boolean"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  if (Platform.OS === "web" && isDev) {
    return DEFAULT_WEB_DEV_API_BASE_URL;
  }

  throw new Error(
    "Missing EXPO_PUBLIC_API_BASE_URL. Set it in ui-mobile/.env for native app development.",
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

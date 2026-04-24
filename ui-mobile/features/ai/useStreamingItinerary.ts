import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
// react-native-sse provides a spec-compliant EventSource for iOS/Android.
// On Expo web, the native browser EventSource is available globally.
import EventSource from "react-native-sse";

import { getAccessToken } from "@/shared/auth/tokenStorage";
import { API_BASE_URL } from "@/shared/api/config";
import type { Itinerary } from "./api";

export type StreamState = {
  text: string;
  itinerary: Itinerary | null;
  error: string | null;
  streaming: boolean;
};

function isValidItinerary(value: unknown): value is Itinerary {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  const days = r.days;
  if (!Array.isArray(days) || days.length === 0) return false;
  return days.every((d) => d && typeof d === "object");
}

function friendlyStreamError(raw: string): string {
  if (raw.includes("429")) return "Our AI is busy right now. Please try again in a moment.";
  if (/50[0-9]/.test(raw)) return "The AI service is having trouble. Please try again shortly.";
  if (raw.includes("408") || raw.includes("504"))
    return "The AI took too long to respond. Please try again.";
  // Never surface raw error strings from the server.
  return "Something went wrong generating your itinerary. Please try again.";
}

type ESInstance = InstanceType<typeof EventSource>;

/**
 * Mobile port of web's useStreamingItinerary.
 *
 * - start(tripId) opens an SSE connection to GET /v1/ai/stream/{tripId}.
 *   Token / complete / error events update state as they arrive.
 * - reset(tripId) closes the stream and clears its state.
 * - All open streams are closed on unmount.
 *
 * On native: uses react-native-sse.
 * On web (Expo web): react-native-sse re-exports a browser-compatible
 *   EventSource so the same code runs in both environments.
 */
export function useStreamingItinerary(): {
  streams: Record<number, StreamState>;
  start: (tripId: number, interestsOverride?: string) => Promise<void>;
  reset: (tripId: number) => void;
} {
  const [streams, setStreams] = useState<Record<number, StreamState>>({});
  const sources = useRef<Record<number, ESInstance>>({});

  const start = useCallback(async (tripId: number, interestsOverride?: string) => {
    // Close any existing stream for this trip.
    sources.current[tripId]?.close();

    const token = await getAccessToken();
    const params = new URLSearchParams();
    if (interestsOverride) params.set("interests_override", interestsOverride);
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/v1/ai/stream/${tripId}${query}`;

    setStreams((prev) => ({
      ...prev,
      [tripId]: { text: "", itinerary: null, error: null, streaming: true },
    }));

    const es = new EventSource(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // react-native-sse connects immediately on construction.
    }) as ESInstance;

    sources.current[tripId] = es;

    es.addEventListener("token", (event) => {
      try {
        const parsed = JSON.parse((event as { data: string }).data) as { token: string };
        setStreams((prev) => ({
          ...prev,
          [tripId]: {
            ...prev[tripId],
            text: (prev[tripId]?.text ?? "") + parsed.token,
          },
        }));
      } catch {
        // Malformed token event — skip silently, continue streaming.
      }
    });

    es.addEventListener("complete", (event) => {
      es.close();
      delete sources.current[tripId];

      let itinerary: Itinerary;
      try {
        itinerary = JSON.parse((event as { data: string }).data) as Itinerary;
      } catch {
        setStreams((prev) => ({
          ...prev,
          [tripId]: {
            ...prev[tripId],
            error: "We couldn't read the itinerary response. Please try again.",
            streaming: false,
          },
        }));
        return;
      }

      if (!isValidItinerary(itinerary)) {
        setStreams((prev) => ({
          ...prev,
          [tripId]: {
            ...prev[tripId],
            error: "The itinerary response was incomplete. Please try again.",
            streaming: false,
          },
        }));
        return;
      }

      setStreams((prev) => ({
        ...prev,
        [tripId]: { ...prev[tripId], itinerary, streaming: false },
      }));
    });

    es.addEventListener("error", (event) => {
      es.close();
      delete sources.current[tripId];
      const raw = (event as { message?: string }).message ?? "";
      setStreams((prev) => ({
        ...prev,
        [tripId]: {
          ...prev[tripId],
          error: friendlyStreamError(raw),
          streaming: false,
        },
      }));
    });
  }, []);

  const reset = useCallback((tripId: number) => {
    sources.current[tripId]?.close();
    delete sources.current[tripId];
    setStreams((prev) => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  }, []);

  useEffect(
    () => () => {
      Object.values(sources.current).forEach((es) => es.close());
    },
    [],
  );

  return { streams, start, reset };
}

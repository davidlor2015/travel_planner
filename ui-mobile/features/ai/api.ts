import { ApiError, apiRequest } from "@/shared/api/client";

export type ItineraryStopStatus = "planned" | "confirmed" | "skipped";

export type ItineraryItem = {
  id?: number | null;
  time: string | null;
  title: string;
  location: string | null;
  lat: number | null;
  lon: number | null;
  notes: string | null;
  cost_estimate: string | null;
  status?: ItineraryStopStatus | null;
  handled_by?: string | null;
  booked_by?: string | null;
};

export type DayAnchorType = "flight" | "hotel_checkin";

export type DayAnchor = {
  type: DayAnchorType;
  label: string;
  time: string | null;
  note: string | null;
  handled_by?: string | null;
  booked_by?: string | null;
};

export type DayPlan = {
  day_number: number;
  date: string | null;
  day_title?: string | null;
  day_note?: string | null;
  anchors?: DayAnchor[];
  items: ItineraryItem[];
};

export type Itinerary = {
  title: string;
  summary: string;
  days: DayPlan[];
  budget_breakdown: Record<string, string> | null;
  packing_list: string[] | null;
  tips: string[] | null;
  source: string;
  source_label: string;
  fallback_used: boolean;
};

export type RefinementVariant =
  | "faster_pace"
  | "cheaper"
  | "more_local"
  | "less_walking";
export type RefinementTimeBlock = "morning" | "afternoon" | "evening";

export type ItineraryItemReference = {
  day_number: number;
  item_index: number;
};

export type ApplySource = "ai_stream" | "manual_edit" | "re_apply";

export const AI_REQUEST_TIMEOUT_MS = 180_000;

type AiActionKey = "apply" | "refine" | "fetch";

function friendlyAiError(action: AiActionKey, status: number, body: string): string {
  if (__DEV__) console.error(`[ai.${action}] ${status}:`, body);
  if (status === 429) return "Our AI is busy right now. Please try again in a moment.";
  if (status >= 500) return "The AI service is having trouble. Please try again shortly.";
  if (status === 408 || status === 504) return "The AI took too long to respond. Please try again.";
  const fallback: Record<AiActionKey, string> = {
    apply: "We couldn't save the itinerary. Try again.",
    refine: "We couldn't refine the itinerary. Try again.",
    fetch: "We couldn't load the itinerary. Try again in a moment.",
  };
  // Never append raw server body — it may contain backend/debug language.
  return fallback[action];
}

export async function applyItinerary(
  tripId: number,
  itinerary: Itinerary,
  source?: ApplySource,
): Promise<void> {
  return apiRequest<void>("/v1/ai/apply", {
    method: "POST",
    body: { trip_id: tripId, itinerary, source: source ?? null },
  }).catch((err) => {
    const status = (err as { status?: number }).status ?? 0;
    throw new Error(friendlyAiError("apply", status, err.message ?? ""));
  });
}

export async function refineItinerary(
  tripId: number,
  payload: {
    current_itinerary: Itinerary;
    locked_items: ItineraryItemReference[];
    favorite_items: ItineraryItemReference[];
    regenerate_day_number: number;
    regenerate_time_block?: RefinementTimeBlock;
    variant?: RefinementVariant;
  },
  signal?: AbortSignal,
): Promise<Itinerary> {
  return apiRequest<Itinerary>("/v1/ai/refine", {
    method: "POST",
    body: { trip_id: tripId, ...payload },
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
    signal,
  }).catch((err) => {
    const status = (err as { status?: number }).status ?? 0;
    throw new Error(friendlyAiError("refine", status, err.message ?? ""));
  });
}

export async function planItinerary(tripId: number): Promise<Itinerary> {
  return apiRequest<Itinerary>("/v1/ai/plan", {
    method: "POST",
    body: { trip_id: tripId },
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
  }).catch((err) => {
    const status = (err as { status?: number }).status ?? 0;
    throw new Error(friendlyAiError("apply", status, err.message ?? ""));
  });
}

export async function getSavedItinerary(tripId: number): Promise<Itinerary> {
  return apiRequest<Itinerary>(`/v1/ai/trips/${tripId}/itinerary`).catch(
    (err) => {
      if (err instanceof ApiError) {
        throw new ApiError(
          err.status,
          friendlyAiError("fetch", err.status, err.message ?? ""),
          err.detail,
        );
      }
      const status = (err as { status?: number }).status ?? 0;
      throw new Error(friendlyAiError("fetch", status, err.message ?? ""));
    },
  );
}

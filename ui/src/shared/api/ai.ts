import { API_URL } from '../../app/config';
import { apiFetch } from './client';

type ActionKey = 'apply' | 'refine' | 'fetch';

/** Group coordination for a stop (persisted with itinerary JSON). */
export type ItineraryStopStatus = 'planned' | 'confirmed' | 'skipped';

export interface ItineraryItem {
  /**
   * Persisted ItineraryEvent primary key. Present on items read from the saved
   * itinerary, absent on AI-generated draft items. Used as the stable stop_ref
   * when posting on-trip execution events. Do not forward to /ai/apply.
   */
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
}

export type DayAnchorType = 'flight' | 'hotel_checkin';

export interface DayAnchor {
  type: DayAnchorType;
  label: string;
  time: string | null;
  note: string | null;
  handled_by?: string | null;
  booked_by?: string | null;
}

export interface DayPlan {
  day_number: number;
  date: string | null;
  day_title?: string | null;
  day_note?: string | null;
  anchors?: DayAnchor[];
  items: ItineraryItem[];
}

export interface Itinerary {
  title: string;
  summary: string;
  days: DayPlan[];
  budget_breakdown: Record<string, string> | null;
  packing_list: string[] | null;
  tips: string[] | null;
  source: string;
  source_label: string;
  fallback_used: boolean;
}

export type RefinementVariant = 'faster_pace' | 'cheaper' | 'more_local' | 'less_walking';
export type RefinementTimeBlock = 'morning' | 'afternoon' | 'evening';

export interface ItineraryItemReference {
  day_number: number;
  item_index: number;
}

export const AI_REQUEST_TIMEOUT_MS = 180_000;
export const AI_SLOW_THRESHOLD_MS = 30_000;

/**
 * Maps AI endpoint HTTP failures to user-friendly copy. The raw server body
 * is still emitted to the dev console so developers can debug without the
 * UI exposing stack traces or raw provider errors to end users.
 */
function friendlyAiErrorMessage(
  action: ActionKey,
  status: number,
  rawBody: string,
): string {
  if (import.meta.env?.DEV) {
    console.error(`[ai.${action}] ${status}:`, rawBody);
  }

  if (status === 429) {
    return "Our AI is busy right now. Please try again in a moment.";
  }
  if (status >= 500 && status < 600) {
    return "The AI service is having trouble. Please try again shortly.";
  }
  if (status === 408 || status === 504) {
    return "The AI took too long to respond. Please try again.";
  }

  const fallbackByAction: Record<ActionKey, string> = {
    apply: 'Failed to apply itinerary.',
    refine: 'Failed to refine itinerary.',
    fetch: 'Failed to fetch itinerary.',
  };
  const trimmed = rawBody.trim();
  return trimmed ? `${fallbackByAction[action]} (${trimmed})` : fallbackByAction[action];
}

export const applyItinerary = async (
  token: string,
  tripId: number,
  itinerary: Itinerary,
): Promise<void> => {
  const response = await apiFetch(`${API_URL}/v1/ai/apply`, {
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trip_id: tripId, itinerary }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(friendlyAiErrorMessage('apply', response.status, text));
  }
};

export const refineItinerary = async (
  token: string,
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
): Promise<Itinerary> => {
  const response = await apiFetch(`${API_URL}/v1/ai/refine`, {
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trip_id: tripId, ...payload }),
    signal,
    // LLM refinement can legitimately take longer than the default 45s
    // client timeout; use the AI-specific budget instead.
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(friendlyAiErrorMessage('refine', response.status, text));
  }

  return response.json();
};

export const getSavedItinerary = async (
  token: string,
  tripId: number,
): Promise<Itinerary> => {
  const response = await apiFetch(`${API_URL}/v1/ai/trips/${tripId}/itinerary`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(friendlyAiErrorMessage('fetch', response.status, text));
  }

  return response.json();
};

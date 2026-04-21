import { API_URL } from '../../app/config';
import { apiFetch } from './client';

/** Group coordination for a stop (persisted with itinerary JSON). */
export type ItineraryStopStatus = 'planned' | 'confirmed' | 'skipped';

export interface ItineraryItem {
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
    throw new Error(`Failed to apply itinerary (${response.status}): ${text}`);
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
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refine itinerary (${response.status}): ${text}`);
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
    throw new Error(`Failed to fetch itinerary (${response.status}): ${text}`);
  }

  return response.json();
};

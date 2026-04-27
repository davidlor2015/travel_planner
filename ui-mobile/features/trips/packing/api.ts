// Path: ui-mobile/features/trips/packing/api.ts
// Summary: Implements api module logic.

import { apiRequest } from "@/shared/api/client";

export type PackingItem = {
  id: number;
  trip_id: number;
  label: string;
  checked: boolean;
  created_at: string;
};

export type PackingSuggestion = {
  label: string;
  reason: string;
};

export async function getPackingItems(tripId: number): Promise<PackingItem[]> {
  return apiRequest<PackingItem[]>(`/v1/trips/${tripId}/packing/`);
}

export async function getPackingSuggestions(
  tripId: number,
): Promise<PackingSuggestion[]> {
  return apiRequest<PackingSuggestion[]>(
    `/v1/trips/${tripId}/packing/suggestions`,
  );
}

export async function createPackingItem(
  tripId: number,
  label: string,
): Promise<PackingItem> {
  return apiRequest<PackingItem>(`/v1/trips/${tripId}/packing/`, {
    method: "POST",
    body: { label },
  });
}

export async function updatePackingItem(
  tripId: number,
  itemId: number,
  patch: { label?: string; checked?: boolean },
): Promise<PackingItem> {
  return apiRequest<PackingItem>(`/v1/trips/${tripId}/packing/${itemId}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deletePackingItem(
  tripId: number,
  itemId: number,
): Promise<void> {
  return apiRequest<void>(`/v1/trips/${tripId}/packing/${itemId}`, {
    method: "DELETE",
  });
}

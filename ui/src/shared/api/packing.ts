import { API_URL } from '../../app/config';
import { apiFetch } from './client';

export interface PackingItem {
  id: number;
  trip_id: number;
  label: string;
  checked: boolean;
  created_at: string;
}

export interface PackingSuggestion {
  label: string;
  reason: string;
}

const base = (tripId: number) => `${API_URL}/v1/trips/${tripId}/packing`;

export async function getPackingItems(token: string, tripId: number): Promise<PackingItem[]> {
  const res = await apiFetch(`${base(tripId)}/`, { token, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Failed to load packing list (${res.status})`);
  return res.json();
}

export async function getPackingSuggestions(token: string, tripId: number): Promise<PackingSuggestion[]> {
  const res = await apiFetch(`${base(tripId)}/suggestions`, { token, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Failed to load packing suggestions (${res.status})`);
  return res.json();
}

export async function createPackingItem(token: string, tripId: number, label: string): Promise<PackingItem> {
  const res = await apiFetch(`${base(tripId)}/`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`Failed to add packing item (${res.status})`);
  return res.json();
}

export async function updatePackingItem(
  token: string,
  tripId: number,
  itemId: number,
  patch: { label?: string; checked?: boolean },
): Promise<PackingItem> {
  const res = await apiFetch(`${base(tripId)}/${itemId}`, {
    method: 'PATCH',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update packing item (${res.status})`);
  return res.json();
}

export async function deletePackingItem(token: string, tripId: number, itemId: number): Promise<void> {
  const res = await apiFetch(`${base(tripId)}/${itemId}`, {
    method: 'DELETE',
    token,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to delete packing item (${res.status})`);
}

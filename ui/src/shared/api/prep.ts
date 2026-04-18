import { API_URL } from '../../app/config';

export type PrepType = 'document' | 'booking' | 'checklist' | 'health' | 'other';

export interface PrepItem {
  id: number;
  trip_id: number;
  title: string;
  prep_type: PrepType;
  due_date: string | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface PrepItemPayload {
  title: string;
  prep_type?: PrepType;
  due_date?: string;
  notes?: string;
}

const base = (tripId: number) => `${API_URL}/v1/trips/${tripId}/prep`;

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export async function getPrepItems(token: string, tripId: number): Promise<PrepItem[]> {
  const response = await fetch(`${base(tripId)}/`, { headers: authHeaders(token) });
  if (!response.ok) throw new Error(`Failed to fetch prep items (${response.status})`);
  return response.json();
}

export async function createPrepItem(token: string, tripId: number, payload: PrepItemPayload): Promise<PrepItem> {
  const response = await fetch(`${base(tripId)}/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to create prep item (${response.status})`);
  return response.json();
}

export async function updatePrepItem(
  token: string,
  tripId: number,
  prepItemId: number,
  payload: { title?: string; prep_type?: PrepType; due_date?: string | null; notes?: string; completed?: boolean },
): Promise<PrepItem> {
  const response = await fetch(`${base(tripId)}/${prepItemId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to update prep item (${response.status})`);
  return response.json();
}

export async function deletePrepItem(token: string, tripId: number, prepItemId: number): Promise<void> {
  const response = await fetch(`${base(tripId)}/${prepItemId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(`Failed to delete prep item (${response.status})`);
}

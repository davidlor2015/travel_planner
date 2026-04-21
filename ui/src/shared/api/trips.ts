import { API_URL } from '../../app/config';
import { apiFetch } from './client';

export interface TripMember {
  user_id: number;
  email: string;
  role: string;
  joined_at: string;
  status: string;
  workspace_last_seen_signature?: string | null;
  workspace_last_seen_snapshot?: Record<string, unknown> | null;
  workspace_last_seen_at?: string | null;
}

export interface TripInvite {
  id: number;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface TripInviteCreateResponse extends TripInvite {
  invite_url: string;
}

export interface TripInviteDetail {
  trip_id: number;
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  email: string;
  status: string;
  expires_at: string;
}

export interface TripInviteAcceptResponse {
  trip_id: number;
  trip_title: string;
  status: string;
}

export interface Trip {
  id: number;
  title: string;
  destination: string;
  description: string | null;
  notes: string | null;
  start_date: string;
  end_date: string;
  user_id: number;
  created_at: string;
  member_count: number;
  members: TripMember[];
  pending_invites: TripInvite[];
}

export interface TripSummary {
  trip_id: number;
  packing_total: number;
  packing_checked: number;
  packing_progress_pct: number;
  reservation_count: number;
  reservation_upcoming_count: number;
  prep_total: number;
  prep_completed: number;
  prep_overdue_count: number;
  budget_limit: number | null;
  budget_total_spent: number;
  budget_remaining: number | null;
  budget_is_over: boolean;
  budget_expense_count: number;
}

interface TripCreate {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  notes?: string;
}

interface TripUpdate {
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface WorkspaceLastSeenPayload {
  signature: string;
  snapshot: Record<string, unknown>;
}

export interface WorkspaceLastSeenResponse {
  workspace_last_seen_signature: string | null;
  workspace_last_seen_snapshot: Record<string, unknown> | null;
  workspace_last_seen_at: string | null;
}

export const getTrips = async (token?: string): Promise<Trip[]> => {
  const response = await apiFetch(`${API_URL}/v1/trips/`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch trips (${response.status}): ${text}`);
  }

  return response.json();
};

export const createTrip = async (token: string, data: TripCreate): Promise<Trip> => {
  const response = await apiFetch(`${API_URL}/v1/trips/`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create trip');
  }

  return response.json();
};

export const updateTrip = async (token: string, id: number, data: TripUpdate): Promise<Trip> => {
  const response = await apiFetch(`${API_URL}/v1/trips/${id}`, {
    method: 'PATCH',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update trip');
  }
  return response.json();
};

export const deleteTrip = async (token: string, id: number): Promise<void> => {
  const response = await apiFetch(`${API_URL}/v1/trips/${id}`, {
    method: 'DELETE',
    token,
  });

  if (!response.ok) {
    throw new Error('Failed to delete trip');
  }
};

export const getTripSummaries = async (token?: string): Promise<TripSummary[]> => {
  const response = await apiFetch(`${API_URL}/v1/trips/summaries`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch trip summaries (${response.status}): ${text}`);
  }

  return response.json();
};

export const updateWorkspaceLastSeen = async (
  token: string,
  tripId: number,
  payload: WorkspaceLastSeenPayload,
): Promise<WorkspaceLastSeenResponse> => {
  const response = await apiFetch(`${API_URL}/v1/trips/${tripId}/workspace/last-seen`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update workspace last seen (${response.status}): ${text}`);
  }

  return response.json();
};

export const createTripInvite = async (
  token: string,
  tripId: number,
  email: string,
): Promise<TripInviteCreateResponse> => {
  const response = await apiFetch(`${API_URL}/v1/trips/${tripId}/invites`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to invite trip member (${response.status}): ${text}`);
  }

  return response.json();
};

export const getTripInviteDetail = async (token: string): Promise<TripInviteDetail> => {
  const response = await fetch(`${API_URL}/v1/trip-invites/${encodeURIComponent(token)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load invite (${response.status}): ${text}`);
  }
  return response.json();
};

export const acceptTripInvite = async (
  accessToken: string,
  inviteToken: string,
): Promise<TripInviteAcceptResponse> => {
  const response = await apiFetch(`${API_URL}/v1/trip-invites/${encodeURIComponent(inviteToken)}/accept`, {
    method: 'POST',
    token: accessToken,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to accept invite (${response.status}): ${text}`);
  }

  return response.json();
};

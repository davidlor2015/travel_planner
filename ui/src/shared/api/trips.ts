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
  invited_by_email: string | null;
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

export interface TripMemberReadinessItem {
  user_id: number;
  email: string;
  role: string;
  readiness_score: number | null;
  blocker_count: number;
  unknown: boolean;
  status: "unknown" | "ready" | "needs_attention";
}

export interface TripMemberReadiness {
  generated_at: string;
  members: TripMemberReadinessItem[];
}

export type TripOnTripResolutionSource =
  | "day_date_exact"
  | "trip_day_offset"
  | "itinerary_sequence"
  | "ambiguous"
  | "none";

export type TripOnTripResolutionConfidence = "high" | "medium" | "low";

export type TripExecutionStatus = "planned" | "confirmed" | "skipped";

export interface TripOnTripStopSnapshot {
  day_number: number | null;
  day_date: string | null;
  title: string | null;
  time: string | null;
  location: string | null;
  status: "planned" | "confirmed" | "skipped" | null;
  source: TripOnTripResolutionSource;
  confidence: TripOnTripResolutionConfidence;
  stop_ref: string | null;
  execution_status: TripExecutionStatus | null;
}

export interface TripOnTripUnplannedStop {
  event_id: number;
  day_date: string;
  time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  created_by_email: string | null;
}

export interface TripOnTripBlocker {
  id: string;
  bucket: "on_trip_execution";
  severity: "blocker" | "watch";
  title: string;
  detail: string;
  owner_email: string | null;
}

export interface TripOnTripSnapshot {
  generated_at: string;
  mode: "inactive" | "active";
  read_only: boolean;
  today: TripOnTripStopSnapshot;
  next_stop: TripOnTripStopSnapshot;
  today_stops: TripOnTripStopSnapshot[];
  today_unplanned: TripOnTripUnplannedStop[];
  blockers: TripOnTripBlocker[];
}

export interface TripExecutionEvent {
  id: number;
  kind: "stop_status" | "unplanned_stop";
  stop_ref: string | null;
  status: TripExecutionStatus | null;
  day_date: string | null;
  time: string | null;
  title: string | null;
  location: string | null;
  notes: string | null;
  created_by_user_id: number;
  created_at: string;
}

export interface UnplannedStopPayload {
  day_date: string;
  title: string;
  time?: string | null;
  location?: string | null;
  notes?: string | null;
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

export const getTripMemberReadiness = async (
  token: string,
  tripId: number,
): Promise<TripMemberReadiness> => {
  const response = await apiFetch(`${API_URL}/v1/trips/${tripId}/member-readiness`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch member readiness (${response.status}): ${text}`);
  }

  return response.json();
};

/**
 * Run an execution-log request and retry once (500ms backoff) on transient
 * failures. A transient failure is either a network error (fetch itself
 * throws) or a 5xx response from the server. 4xx responses are user-facing
 * errors that would never succeed on retry, so they surface immediately.
 *
 * Callers that rollback optimistic UI should only do so after this helper
 * rejects, which means both attempts failed.
 */
async function executeWithRetry(
  perform: () => Promise<Response>,
  label: string,
): Promise<Response> {
  type Outcome =
    | { ok: true; response: Response }
    | { ok: false; retryable: boolean; error: Error };

  const runOnce = async (): Promise<Outcome> => {
    let response: Response;
    try {
      response = await perform();
    } catch (err) {
      return {
        ok: false,
        retryable: true,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
    if (response.ok) return { ok: true, response };
    const retryable = response.status >= 500;
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      retryable,
      error: new Error(`Failed to ${label} (${response.status}): ${text}`),
    };
  };

  const first = await runOnce();
  if (first.ok) return first.response;
  if (!first.retryable) throw first.error;
  await new Promise((resolve) => setTimeout(resolve, 500));
  const second = await runOnce();
  if (second.ok) return second.response;
  throw second.error;
}

const resolveClientTimezone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export const getTripOnTripSnapshot = async (
  token: string,
  tripId: number,
): Promise<TripOnTripSnapshot> => {
  const tz = resolveClientTimezone();
  const query = tz ? `?tz=${encodeURIComponent(tz)}` : '';
  const response = await apiFetch(`${API_URL}/v1/trips/${tripId}/on-trip-snapshot${query}`, {
    method: 'GET',
    token,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch on-trip snapshot (${response.status}): ${text}`);
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

export const postStopStatus = async (
  token: string,
  tripId: number,
  payload: { stop_ref: string; status: TripExecutionStatus },
): Promise<TripExecutionEvent> => {
  const response = await executeWithRetry(
    () =>
      apiFetch(`${API_URL}/v1/trips/${tripId}/execution/stop-status`, {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    'update stop status',
  );
  return response.json();
};

export const postUnplannedStop = async (
  token: string,
  tripId: number,
  payload: UnplannedStopPayload,
): Promise<TripExecutionEvent> => {
  const response = await executeWithRetry(
    () =>
      apiFetch(`${API_URL}/v1/trips/${tripId}/execution/unplanned-stop`, {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    'log stop',
  );
  return response.json();
};

export const deleteExecutionEvent = async (
  token: string,
  tripId: number,
  eventId: number,
): Promise<void> => {
  await executeWithRetry(
    () =>
      apiFetch(`${API_URL}/v1/trips/${tripId}/execution/events/${eventId}`, {
        method: 'DELETE',
        token,
      }),
    'delete event',
  );
};

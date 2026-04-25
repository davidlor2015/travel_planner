import { apiFetch, apiRequest } from "@/shared/api/client";
import { executeWithRetry } from "@/shared/api/executeWithRetry";

import type {
  PlaceSearchApiResponse,
  TripCreate,
  TripExecutionEvent,
  TripExecutionStatus,
  TripInviteAcceptResponse,
  TripInviteCreateResponse,
  TripInviteDetail,
  TripMemberReadiness,
  TripOnTripSnapshot,
  TripResponse,
  TripSummary,
  TripUpdate,
  UnplannedStopPayload,
  WorkspaceLastSeenPayload,
  WorkspaceLastSeenResponse,
} from "./types";

export async function getTrips(params?: {
  skip?: number;
  limit?: number;
}): Promise<TripResponse[]> {
  const search = new URLSearchParams();
  if (typeof params?.skip === "number") search.set("skip", String(params.skip));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return apiRequest<TripResponse[]>(query ? `/v1/trips/?${query}` : "/v1/trips/");
}

export async function getTripById(tripId: number): Promise<TripResponse> {
  return apiRequest<TripResponse>(`/v1/trips/${tripId}`);
}

export async function createTrip(data: TripCreate): Promise<TripResponse> {
  return apiRequest<TripResponse>("/v1/trips/", {
    method: "POST",
    body: data,
  });
}

export async function updateTrip(
  tripId: number,
  data: TripUpdate,
): Promise<TripResponse> {
  return apiRequest<TripResponse>(`/v1/trips/${tripId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteTrip(tripId: number): Promise<void> {
  return apiRequest<void>(`/v1/trips/${tripId}`, { method: "DELETE" });
}

export async function getTripSummaries(): Promise<TripSummary[]> {
  return apiRequest<TripSummary[]>("/v1/trips/summaries");
}

export async function searchPlaces(query: string): Promise<PlaceSearchApiResponse> {
  const normalized = query.trim();
  if (!normalized) return { suggestions: [] };
  return apiRequest<PlaceSearchApiResponse>(
    `/v1/search/places?q=${encodeURIComponent(normalized)}`,
  );
}

export async function updateWorkspaceLastSeen(
  tripId: number,
  payload: WorkspaceLastSeenPayload,
): Promise<WorkspaceLastSeenResponse> {
  return apiRequest<WorkspaceLastSeenResponse>(
    `/v1/trips/${tripId}/workspace/last-seen`,
    { method: "POST", body: payload },
  );
}

export async function getTripMemberReadiness(
  tripId: number,
): Promise<TripMemberReadiness> {
  return apiRequest<TripMemberReadiness>(`/v1/trips/${tripId}/member-readiness`);
}

function resolveClientTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export async function getTripOnTripSnapshot(
  tripId: number,
): Promise<TripOnTripSnapshot> {
  const tz = resolveClientTimezone();
  const query = tz ? `?tz=${encodeURIComponent(tz)}` : "";
  return apiRequest<TripOnTripSnapshot>(
    `/v1/trips/${tripId}/on-trip-snapshot${query}`,
  );
}

export async function createTripInvite(
  tripId: number,
  email: string,
): Promise<TripInviteCreateResponse> {
  return apiRequest<TripInviteCreateResponse>(`/v1/trips/${tripId}/invites`, {
    method: "POST",
    body: { email },
  });
}

export async function getTripInviteDetail(
  inviteToken: string,
): Promise<TripInviteDetail> {
  return apiRequest<TripInviteDetail>(
    `/v1/trip-invites/${encodeURIComponent(inviteToken)}`,
    { skipAuth: true },
  );
}

export async function acceptTripInvite(
  inviteToken: string,
): Promise<TripInviteAcceptResponse> {
  return apiRequest<TripInviteAcceptResponse>(
    `/v1/trip-invites/${encodeURIComponent(inviteToken)}/accept`,
    { method: "POST" },
  );
}

export async function postStopStatus(
  tripId: number,
  payload: { stop_ref: string; status: TripExecutionStatus },
): Promise<TripExecutionEvent> {
  const response = await executeWithRetry(
    () =>
      apiFetch(`/v1/trips/${tripId}/execution/stop-status`, {
        method: "POST",
        body: payload,
      }),
    "update stop status",
  );
  return response.json();
}

export async function postUnplannedStop(
  tripId: number,
  payload: UnplannedStopPayload,
): Promise<TripExecutionEvent> {
  const response = await executeWithRetry(
    () =>
      apiFetch(`/v1/trips/${tripId}/execution/unplanned-stop`, {
        method: "POST",
        body: payload,
      }),
    "log stop",
  );
  return response.json();
}

export async function deleteExecutionEvent(
  tripId: number,
  eventId: number,
): Promise<void> {
  await executeWithRetry(
    () =>
      apiFetch(`/v1/trips/${tripId}/execution/events/${eventId}`, {
        method: "DELETE",
      }),
    "delete event",
    { treat404AsSuccess: true },
  );
}

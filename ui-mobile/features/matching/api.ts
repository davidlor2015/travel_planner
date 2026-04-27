// Path: ui-mobile/features/matching/api.ts
// Summary: Implements api module logic.

import { ApiError, apiFetch, apiRequest } from "@/shared/api/client";

export type TravelStyle = "adventure" | "relaxed" | "cultural" | "party";
export type BudgetRange = "budget" | "mid_range" | "luxury";
export type MatchRequestStatus = "open" | "closed";
export type MatchInteractionStatus =
  | "interested"
  | "intro_saved"
  | "passed"
  | "accepted"
  | "declined";

export type TravelProfile = {
  id: number;
  user_id: number;
  travel_style: TravelStyle;
  budget_range: BudgetRange;
  interests: string[];
  group_size_min: number;
  group_size_max: number;
  is_discoverable: boolean;
};

export type TravelProfilePayload = {
  travel_style: TravelStyle;
  budget_range: BudgetRange;
  interests: string[];
  group_size_min: number;
  group_size_max: number;
  is_discoverable: boolean;
};

export type MatchRequest = {
  id: number;
  trip_id: number;
  user_id: number;
  status: MatchRequestStatus;
  created_at: string;
};

export type MatchInteraction = {
  id: number;
  request_id: number;
  match_result_id: number;
  user_id: number;
  status: MatchInteractionStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoreBreakdown = {
  destination: number;
  date_overlap: number;
  travel_style: number;
  budget: number;
  interests: number;
  group_size: number;
};

export type MatchedTrip = {
  id: number;
  destination: string;
  start_date: string;
  end_date: string;
};

export type MatchedUser = {
  id: number;
  email: string;
};

export type MatchResult = {
  id: number;
  score: number;
  breakdown: ScoreBreakdown;
  matched_trip: MatchedTrip;
  matched_user: MatchedUser;
  interaction: MatchInteraction | null;
};

export async function getMatchingProfile(): Promise<TravelProfile | null> {
  const response = await apiFetch("/v1/matching/profile");
  if (response.status === 404) return null;
  if (!response.ok) throw await ApiError.fromResponse(response, "Failed to fetch profile");
  return response.json();
}

export async function upsertMatchingProfile(
  data: TravelProfilePayload,
): Promise<TravelProfile> {
  return apiRequest<TravelProfile>("/v1/matching/profile", {
    method: "POST",
    body: data,
  });
}

export async function getMatchRequests(): Promise<MatchRequest[]> {
  return apiRequest<MatchRequest[]>("/v1/matching/requests");
}

export async function openMatchRequest(
  tripId: number,
): Promise<{ request: MatchRequest; results: MatchResult[] }> {
  return apiRequest<{ request: MatchRequest; results: MatchResult[] }>(
    "/v1/matching/requests",
    { method: "POST", body: { trip_id: tripId } },
  );
}

export async function closeMatchRequest(requestId: number): Promise<void> {
  return apiRequest<void>(`/v1/matching/requests/${requestId}`, {
    method: "DELETE",
  });
}

export async function getMatches(requestId: number): Promise<MatchResult[]> {
  return apiRequest<MatchResult[]>(
    `/v1/matching/requests/${requestId}/matches`,
  );
}

export async function updateMatchInteraction(
  requestId: number,
  matchResultId: number,
  data: { status: MatchInteractionStatus; note?: string | null },
): Promise<MatchResult> {
  return apiRequest<MatchResult>(
    `/v1/matching/requests/${requestId}/matches/${matchResultId}/interaction`,
    { method: "PUT", body: data },
  );
}

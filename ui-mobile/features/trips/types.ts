export type TripMember = {
  user_id: number;
  email: string;
  role: string;
  joined_at: string;
  status: string;
  workspace_last_seen_signature: string | null;
  workspace_last_seen_snapshot: Record<string, unknown> | null;
  workspace_last_seen_at: string | null;
};

export type TripInvite = {
  id: number;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export type TripInviteCreateResponse = TripInvite & {
  invite_url: string;
};

export type TripInviteDetail = {
  trip_id: number;
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  email: string;
  status: string;
  expires_at: string;
  invited_by_email: string | null;
};

export type TripInviteAcceptResponse = {
  trip_id: number;
  trip_title: string;
  status: string;
};

export type TripResponse = {
  id: number;
  title: string;
  destination: string;
  description: string | null;
  start_date: string;
  end_date: string;
  notes: string | null;
  user_id: number;
  created_at: string;
  member_count: number;
  members: TripMember[];
  pending_invites: TripInvite[];
};

export type TripCreate = {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  notes?: string;
};

export type TripUpdate = {
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
};

export type TripSummary = {
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
};

export type WorkspaceLastSeenPayload = {
  signature: string;
  snapshot: Record<string, unknown>;
};

export type WorkspaceLastSeenResponse = {
  workspace_last_seen_signature: string | null;
  workspace_last_seen_snapshot: Record<string, unknown> | null;
  workspace_last_seen_at: string | null;
};

export type TripMemberReadinessItem = {
  user_id: number;
  email: string;
  role: string;
  readiness_score: number | null;
  blocker_count: number;
  unknown: boolean;
  status: "unknown" | "ready" | "needs_attention";
};

export type TripMemberReadiness = {
  generated_at: string;
  members: TripMemberReadinessItem[];
};

export type TripOnTripResolutionSource =
  | "day_date_exact"
  | "trip_day_offset"
  | "itinerary_sequence"
  | "ambiguous"
  | "none";

export type TripOnTripResolutionConfidence = "high" | "medium" | "low";

export type TripExecutionStatus = "planned" | "confirmed" | "skipped";

export type TripOnTripStopSnapshot = {
  day_number: number | null;
  day_date: string | null;
  title: string | null;
  time: string | null;
  location: string | null;
  notes: string | null;
  lat: number | null;
  lon: number | null;
  status: "planned" | "confirmed" | "skipped" | null;
  source: TripOnTripResolutionSource;
  confidence: TripOnTripResolutionConfidence;
  stop_ref: string | null;
  execution_status: TripExecutionStatus | null;
};

export type TripOnTripUnplannedStop = {
  event_id: number;
  day_date: string;
  time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  created_by_email: string | null;
};

export type TripOnTripBlocker = {
  id: string;
  bucket: "on_trip_execution";
  severity: "blocker" | "watch";
  title: string;
  detail: string;
  owner_email: string | null;
};

export type TripOnTripSnapshot = {
  generated_at: string;
  mode: "inactive" | "active";
  read_only: boolean;
  today: TripOnTripStopSnapshot;
  next_stop: TripOnTripStopSnapshot;
  today_stops: TripOnTripStopSnapshot[];
  today_unplanned: TripOnTripUnplannedStop[];
  blockers: TripOnTripBlocker[];
};

export type TripExecutionEvent = {
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
};

export type UnplannedStopPayload = {
  day_date: string;
  title: string;
  time?: string | null;
  location?: string | null;
  notes?: string | null;
  client_request_id?: string;
};

export type TripListItem = {
  id: number;
  title: string;
  destination: string;
  dateRange: string;
  memberCount: number;
  status: "upcoming" | "active" | "past";
};

export type PlaceSuggestion = {
  id: string;
  label: string;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PlaceSearchApiSuggestion = {
  id?: string | number | null;
  place_id?: string | number | null;
  label?: string | null;
  display_name?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  state?: string | null;
  country?: string | null;
  country_code?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lon?: number | string | null;
};

export type PlaceSearchApiResponse =
  | PlaceSearchApiSuggestion[]
  | {
      suggestions?: PlaceSearchApiSuggestion[] | null;
      places?: PlaceSearchApiSuggestion[] | null;
      results?: PlaceSearchApiSuggestion[] | null;
      data?: PlaceSearchApiSuggestion[] | null;
    };

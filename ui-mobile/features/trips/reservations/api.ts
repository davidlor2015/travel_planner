// Path: ui-mobile/features/trips/reservations/api.ts
// Summary: Implements api module logic.

import { apiRequest } from "@/shared/api/client";

export type ReservationType =
  | "flight"
  | "hotel"
  | "train"
  | "bus"
  | "car"
  | "activity"
  | "restaurant"
  | "other";

export type Reservation = {
  id: number;
  trip_id: number;
  title: string;
  reservation_type: ReservationType;
  provider: string | null;
  confirmation_code: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  notes: string | null;
  amount: number | null;
  currency: string | null;
  budget_expense_id: number | null;
  created_at: string;
};

export type ReservationPayload = {
  title: string;
  reservation_type: ReservationType;
  provider?: string;
  confirmation_code?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  notes?: string;
  amount?: number;
  currency?: string;
  sync_to_budget?: boolean;
};

export async function getReservations(tripId: number): Promise<Reservation[]> {
  return apiRequest<Reservation[]>(`/v1/trips/${tripId}/reservations/`);
}

export async function createReservation(
  tripId: number,
  payload: ReservationPayload,
): Promise<Reservation> {
  return apiRequest<Reservation>(`/v1/trips/${tripId}/reservations/`, {
    method: "POST",
    body: payload,
  });
}

export async function updateReservation(
  tripId: number,
  reservationId: number,
  payload: Partial<ReservationPayload>,
): Promise<Reservation> {
  return apiRequest<Reservation>(
    `/v1/trips/${tripId}/reservations/${reservationId}`,
    { method: "PATCH", body: payload },
  );
}

export async function deleteReservation(
  tripId: number,
  reservationId: number,
): Promise<void> {
  return apiRequest<void>(
    `/v1/trips/${tripId}/reservations/${reservationId}`,
    { method: "DELETE" },
  );
}

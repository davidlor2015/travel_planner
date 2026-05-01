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

export type ReservationImportStatus =
  | "extracted"
  | "needs_manual_entry"
  | "needs_image_extraction"
  | "unsupported_file";

export type ReservationImportSourceType = "pdf" | "image" | "unknown";

export type ReservationImportFields = {
  type: "flight" | "lodging" | "restaurant" | "activity" | "other" | null;
  vendor: string | null;
  confirmation_number: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  traveler_names: string[] | null;
  price_total: string | null;
  notes: string | null;
};

export type ReservationImportResponse = {
  status: ReservationImportStatus;
  source_type: ReservationImportSourceType;
  fields: ReservationImportFields;
  confidence: "high" | "medium" | "low" | null;
  message: string | null;
};

export type ReservationImportFile = {
  uri: string;
  name: string;
  type?: string | null;
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

export async function importReservationConfirmation(
  tripId: number,
  file: ReservationImportFile,
  token?: string | null,
): Promise<ReservationImportResponse> {
  const formData = new FormData();
  formData.append("file", file as unknown as Blob);

  return apiRequest<ReservationImportResponse>(
    `/v1/trips/${tripId}/reservations/import`,
    {
      method: "POST",
      body: formData,
      authToken: token ?? undefined,
    },
  );
}

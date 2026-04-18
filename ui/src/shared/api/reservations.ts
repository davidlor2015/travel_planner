import { API_URL } from '../../app/config';

export type ReservationType =
  | 'flight'
  | 'hotel'
  | 'train'
  | 'bus'
  | 'car'
  | 'activity'
  | 'restaurant'
  | 'other';

export interface Reservation {
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
}

export interface ReservationPayload {
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
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${fallback} (${response.status}): ${text}`);
  }
  return response.json();
}

export const getReservations = async (token: string, tripId: number): Promise<Reservation[]> => {
  const response = await fetch(`${API_URL}/v1/trips/${tripId}/reservations/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<Reservation[]>(response, 'Failed to fetch reservations');
};

export const createReservation = async (
  token: string,
  tripId: number,
  payload: ReservationPayload,
): Promise<Reservation> => {
  const response = await fetch(`${API_URL}/v1/trips/${tripId}/reservations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<Reservation>(response, 'Failed to create reservation');
};

export const updateReservation = async (
  token: string,
  tripId: number,
  reservationId: number,
  payload: Partial<ReservationPayload>,
): Promise<Reservation> => {
  const response = await fetch(`${API_URL}/v1/trips/${tripId}/reservations/${reservationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<Reservation>(response, 'Failed to update reservation');
};

export const deleteReservation = async (
  token: string,
  tripId: number,
  reservationId: number,
): Promise<void> => {
  const response = await fetch(`${API_URL}/v1/trips/${tripId}/reservations/${reservationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete reservation (${response.status}): ${text}`);
  }
};

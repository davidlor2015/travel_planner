// Path: ui/src/features/trips/logistics/reservations/useReservations.ts
// Summary: Provides useReservations hook behavior.

import { useCallback, useEffect, useReducer } from 'react';
import {
  createReservation,
  deleteReservation,
  getReservations,
  updateReservation,
  type Reservation,
  type ReservationPayload,
} from '../../../../shared/api/reservations';

interface ReservationState {
  items: Reservation[];
  loading: boolean;
  error: string | null;
}

type ReservationAction =
  | { type: 'fetch/start' }
  | { type: 'fetch/done'; items: Reservation[] }
  | { type: 'fetch/error'; message: string }
  | { type: 'item/add'; item: Reservation }
  | { type: 'item/replace'; previousId: number; item: Reservation }
  | { type: 'item/remove'; id: number };

function sortReservations(items: Reservation[]): Reservation[] {
  return [...items].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function reservationReducer(state: ReservationState, action: ReservationAction): ReservationState {
  switch (action.type) {
    case 'fetch/start':
      return { ...state, loading: true, error: null };
    case 'fetch/done':
      return { items: action.items, loading: false, error: null };
    case 'fetch/error':
      return { ...state, loading: false, error: action.message };
    case 'item/add':
      return { ...state, items: sortReservations([...state.items, action.item]) };
    case 'item/replace':
      return {
        ...state,
        items: sortReservations(state.items.map((item) => (item.id === action.previousId ? action.item : item))),
      };
    case 'item/remove':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
  }
}

export function useReservations(token: string, tripId: number) {
  const [{ items, loading, error }, dispatch] = useReducer(reservationReducer, {
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'fetch/start' });
    getReservations(token, tripId)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'fetch/done', items: data });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: 'fetch/error', message: err instanceof Error ? err.message : 'Failed to load reservations' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

  const addReservation = useCallback(async (payload: ReservationPayload) => {
    const tempId = -Date.now();
    const optimistic: Reservation = {
      id: tempId,
      trip_id: tripId,
      title: payload.title,
      reservation_type: payload.reservation_type,
      provider: payload.provider ?? null,
      confirmation_code: payload.confirmation_code ?? null,
      start_at: payload.start_at ?? null,
      end_at: payload.end_at ?? null,
      location: payload.location ?? null,
      notes: payload.notes ?? null,
      amount: payload.amount ?? null,
      currency: payload.currency ?? null,
      budget_expense_id: null,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'item/add', item: optimistic });
    try {
      const created = await createReservation(token, tripId, payload);
      dispatch({ type: 'item/replace', previousId: tempId, item: created });
      return created;
    } catch (error) {
      dispatch({ type: 'item/remove', id: tempId });
      throw error;
    }
  }, [token, tripId]);

  const removeReservation = useCallback(async (reservationId: number) => {
    // Snapshot the item before optimistic removal so we can restore it if
    // BOTH the delete call AND the recovery getReservations call fail. Without
    // this guarantee the UI could silently drift from the DB until reload.
    const removed = items.find((item) => item.id === reservationId) ?? null;
    dispatch({ type: 'item/remove', id: reservationId });
    try {
      await deleteReservation(token, tripId, reservationId);
    } catch (error) {
      try {
        const fresh = await getReservations(token, tripId);
        dispatch({ type: 'fetch/done', items: fresh });
      } catch {
        // Recovery fetch also failed: re-insert the optimistically removed
        // item so the list still reflects server reality as we knew it.
        if (removed) {
          dispatch({ type: 'item/add', item: removed });
        }
      }
      throw error;
    }
  }, [items, token, tripId]);

  const editReservation = useCallback(async (reservationId: number, payload: Partial<ReservationPayload>) => {
    const current = items.find((item) => item.id === reservationId);
    if (!current) {
      throw new Error('Reservation not found');
    }
    const optimistic: Reservation = {
      ...current,
      title: payload.title ?? current.title,
      reservation_type: payload.reservation_type ?? current.reservation_type,
      provider: payload.provider ?? current.provider,
      confirmation_code: payload.confirmation_code ?? current.confirmation_code,
      start_at: payload.start_at ?? current.start_at,
      end_at: payload.end_at ?? current.end_at,
      location: payload.location ?? current.location,
      notes: payload.notes ?? current.notes,
      amount: payload.amount ?? current.amount,
      currency: payload.currency ?? current.currency,
    };
    dispatch({ type: 'item/replace', previousId: reservationId, item: optimistic });
    try {
      const updated = await updateReservation(token, tripId, reservationId, payload);
      dispatch({ type: 'item/replace', previousId: reservationId, item: updated });
      return updated;
    } catch (error) {
      dispatch({ type: 'item/replace', previousId: reservationId, item: current });
      throw error;
    }
  }, [items, token, tripId]);

  return { items, loading, error, addReservation, editReservation, removeReservation };
}

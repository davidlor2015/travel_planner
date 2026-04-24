import { useCallback, useEffect, useReducer } from "react";

import {
  createReservation,
  deleteReservation,
  getReservations,
  updateReservation,
  type Reservation,
  type ReservationPayload,
} from "./api";

type ReservationState = {
  items: Reservation[];
  loading: boolean;
  error: string | null;
};

type ReservationAction =
  | { type: "fetch/start" }
  | { type: "fetch/done"; items: Reservation[] }
  | { type: "fetch/error"; message: string }
  | { type: "item/add"; item: Reservation }
  | { type: "item/replace"; previousId: number; item: Reservation }
  | { type: "item/remove"; id: number };

function sortByStartAt(items: Reservation[]): Reservation[] {
  return [...items].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function reservationReducer(
  state: ReservationState,
  action: ReservationAction,
): ReservationState {
  switch (action.type) {
    case "fetch/start":
      return { ...state, loading: true, error: null };
    case "fetch/done":
      return { items: action.items, loading: false, error: null };
    case "fetch/error":
      return { ...state, loading: false, error: action.message };
    case "item/add":
      return { ...state, items: sortByStartAt([...state.items, action.item]) };
    case "item/replace":
      return {
        ...state,
        items: sortByStartAt(
          state.items.map((r) => (r.id === action.previousId ? action.item : r)),
        ),
      };
    case "item/remove":
      return { ...state, items: state.items.filter((r) => r.id !== action.id) };
  }
}

export function useReservations(tripId: number) {
  const [{ items, loading, error }, dispatch] = useReducer(reservationReducer, {
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "fetch/start" });
    getReservations(tripId)
      .then((data) => {
        if (!cancelled) dispatch({ type: "fetch/done", items: data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: "fetch/error",
            message: err instanceof Error ? err.message : "Failed to load reservations",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const addReservation = useCallback(
    async (payload: ReservationPayload) => {
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
      dispatch({ type: "item/add", item: optimistic });
      try {
        const created = await createReservation(tripId, payload);
        dispatch({ type: "item/replace", previousId: tempId, item: created });
        return created;
      } catch (err) {
        dispatch({ type: "item/remove", id: tempId });
        throw err;
      }
    },
    [tripId],
  );

  const editReservation = useCallback(
    async (reservationId: number, payload: Partial<ReservationPayload>) => {
      const current = items.find((r) => r.id === reservationId);
      if (!current) throw new Error("Reservation not found");
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
      dispatch({ type: "item/replace", previousId: reservationId, item: optimistic });
      try {
        const updated = await updateReservation(tripId, reservationId, payload);
        dispatch({ type: "item/replace", previousId: reservationId, item: updated });
        return updated;
      } catch (err) {
        dispatch({ type: "item/replace", previousId: reservationId, item: current });
        throw err;
      }
    },
    [tripId, items],
  );

  const removeReservation = useCallback(
    async (reservationId: number) => {
      const removed = items.find((r) => r.id === reservationId) ?? null;
      dispatch({ type: "item/remove", id: reservationId });
      try {
        await deleteReservation(tripId, reservationId);
      } catch (err) {
        try {
          const fresh = await getReservations(tripId);
          dispatch({ type: "fetch/done", items: fresh });
        } catch {
          if (removed) dispatch({ type: "item/add", item: removed });
        }
        throw err;
      }
    },
    [tripId, items],
  );

  return { items, loading, error, addReservation, editReservation, removeReservation };
}

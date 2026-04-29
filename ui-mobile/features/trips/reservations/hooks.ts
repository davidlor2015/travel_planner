// Path: ui-mobile/features/trips/reservations/hooks.ts
// Summary: Implements hooks module logic.

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createReservation,
  deleteReservation,
  getReservations,
  updateReservation,
  type Reservation,
  type ReservationPayload,
} from "./api";
import { tripKeys } from "../hooks";

export const reservationKeys = {
  list: (tripId: number) => ["trips", tripId, "reservations"] as const,
};

function sortByStartAt(items: Reservation[]): Reservation[] {
  return [...items].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function useReservations(tripId: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: reservationKeys.list(tripId),
    queryFn: () => getReservations(tripId),
    select: sortByStartAt,
  });

  const items: Reservation[] = query.data ?? [];

  const invalidateSummaries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) }),
      queryClient.invalidateQueries({ queryKey: tripKeys.summaries }),
    ]);
  };

  const addMutation = useMutation({
    mutationFn: (payload: ReservationPayload) => createReservation(tripId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: reservationKeys.list(tripId) });
      const prev = queryClient.getQueryData<Reservation[]>(reservationKeys.list(tripId));
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
      queryClient.setQueryData<Reservation[]>(reservationKeys.list(tripId), (old) =>
        sortByStartAt([...(old ?? []), optimistic]),
      );
      return { prev, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(reservationKeys.list(tripId), ctx.prev);
    },
    onSuccess: (created, _vars, ctx) => {
      queryClient.setQueryData<Reservation[]>(reservationKeys.list(tripId), (old) =>
        sortByStartAt((old ?? []).map((r) => (r.id === ctx?.tempId ? created : r))),
      );
      void invalidateSummaries();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      reservationId,
      payload,
    }: {
      reservationId: number;
      payload: Partial<ReservationPayload>;
    }) => updateReservation(tripId, reservationId, payload),
    onMutate: async ({ reservationId, payload }) => {
      await queryClient.cancelQueries({ queryKey: reservationKeys.list(tripId) });
      const prev = queryClient.getQueryData<Reservation[]>(reservationKeys.list(tripId));
      const current = items.find((r) => r.id === reservationId);
      if (current) {
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
        queryClient.setQueryData<Reservation[]>(reservationKeys.list(tripId), (old) =>
          sortByStartAt((old ?? []).map((r) => (r.id === reservationId ? optimistic : r))),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(reservationKeys.list(tripId), ctx.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Reservation[]>(reservationKeys.list(tripId), (old) =>
        sortByStartAt((old ?? []).map((r) => (r.id === updated.id ? updated : r))),
      );
      void invalidateSummaries();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (reservationId: number) => deleteReservation(tripId, reservationId),
    onMutate: async (reservationId) => {
      await queryClient.cancelQueries({ queryKey: reservationKeys.list(tripId) });
      const prev = queryClient.getQueryData<Reservation[]>(reservationKeys.list(tripId));
      queryClient.setQueryData<Reservation[]>(reservationKeys.list(tripId), (old) =>
        (old ?? []).filter((r) => r.id !== reservationId),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(reservationKeys.list(tripId), ctx.prev);
    },
    onSuccess: () => {
      void invalidateSummaries();
    },
  });

  const addReservation = useCallback(
    (payload: ReservationPayload) => addMutation.mutateAsync(payload),
    [addMutation],
  );

  const editReservation = useCallback(
    (reservationId: number, payload: Partial<ReservationPayload>) =>
      editMutation.mutateAsync({ reservationId, payload }),
    [editMutation],
  );

  const removeReservation = useCallback(
    (reservationId: number) => removeMutation.mutateAsync(reservationId),
    [removeMutation],
  );

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: reservationKeys.list(tripId) }),
    [queryClient, tripId],
  );

  return {
    items,
    loading: query.isLoading,
    error: query.isError ? "We couldn't load your bookings. Try again in a moment." : null,
    addReservation,
    editReservation,
    removeReservation,
    reload,
  };
}

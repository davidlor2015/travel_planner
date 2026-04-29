// Path: ui-mobile/features/trips/packing/hooks.ts
// Summary: Implements hooks module logic.

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createPackingItem,
  deletePackingItem,
  getPackingItems,
  getPackingSuggestions,
  updatePackingItem,
  type PackingItem,
} from "./api";
import { tripKeys } from "../hooks";

export const packingKeys = {
  items: (tripId: number) => ["trips", tripId, "packing", "items"] as const,
  suggestions: (tripId: number) => ["trips", tripId, "packing", "suggestions"] as const,
};

const EMPTY_ITEMS: PackingItem[] = [];

export function usePackingList(tripId: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: packingKeys.items(tripId),
    queryFn: () => getPackingItems(tripId),
  });

  const items: PackingItem[] = query.data ?? EMPTY_ITEMS;

  const invalidateSummaries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) }),
      queryClient.invalidateQueries({ queryKey: tripKeys.summaries }),
    ]);
  }, [queryClient, tripId]);

  const addMutation = useMutation({
    mutationFn: (label: string) => createPackingItem(tripId, label),
    onMutate: async (label) => {
      await queryClient.cancelQueries({ queryKey: packingKeys.items(tripId) });
      const prev = queryClient.getQueryData<PackingItem[]>(packingKeys.items(tripId));
      const tempId = -Date.now();
      const optimistic: PackingItem = {
        id: tempId,
        trip_id: tripId,
        label,
        checked: false,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { prev, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(packingKeys.items(tripId), ctx.prev);
    },
    onSuccess: (item, _vars, ctx) => {
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).map((i) => (i.id === ctx?.tempId ? item : i)),
      );
      void invalidateSummaries();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      updatePackingItem(tripId, id, { checked }),
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: packingKeys.items(tripId) });
      const prev = queryClient.getQueryData<PackingItem[]>(packingKeys.items(tripId));
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, checked } : i)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(packingKeys.items(tripId), ctx.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).map((i) => (i.id === updated.id ? updated : i)),
      );
      void invalidateSummaries();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => deletePackingItem(tripId, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: packingKeys.items(tripId) });
      const prev = queryClient.getQueryData<PackingItem[]>(packingKeys.items(tripId));
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).filter((i) => i.id !== id),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(packingKeys.items(tripId), ctx.prev);
    },
    onSuccess: () => {
      void invalidateSummaries();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      updatePackingItem(tripId, id, { label }),
    onMutate: async ({ id, label }) => {
      await queryClient.cancelQueries({ queryKey: packingKeys.items(tripId) });
      const prev = queryClient.getQueryData<PackingItem[]>(packingKeys.items(tripId));
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, label } : i)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(packingKeys.items(tripId), ctx.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<PackingItem[]>(packingKeys.items(tripId), (old) =>
        (old ?? []).map((i) => (i.id === updated.id ? updated : i)),
      );
      void invalidateSummaries();
    },
  });

  const addItem = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return Promise.resolve(null);
      return addMutation.mutateAsync(trimmed);
    },
    [addMutation],
  );

  const toggleItem = useCallback(
    (id: number) => {
      const current = items.find((i) => i.id === id);
      if (!current) return Promise.resolve();
      return toggleMutation.mutateAsync({ id, checked: !current.checked });
    },
    [items, toggleMutation],
  );

  const removeItem = useCallback(
    (id: number) => removeMutation.mutateAsync(id),
    [removeMutation],
  );

  const editItem = useCallback(
    (id: number, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return Promise.resolve(null);
      return editMutation.mutateAsync({ id, label: trimmed });
    },
    [editMutation],
  );

  const clearChecked = useCallback(async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    const results = await Promise.allSettled(checked.map((i) => deletePackingItem(tripId, i.id)));
    // Refetch to get authoritative state after bulk delete.
    await queryClient.invalidateQueries({ queryKey: packingKeys.items(tripId) });
    await invalidateSummaries();
    const firstFailure = results.find((r) => r.status === "rejected");
    if (firstFailure) throw (firstFailure as PromiseRejectedResult).reason;
  }, [items, tripId, queryClient, invalidateSummaries]);

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: packingKeys.items(tripId) }),
    [queryClient, tripId],
  );

  return {
    items,
    loading: query.isLoading,
    error: query.isError ? "We couldn't load the packing list. Try again in a moment." : null,
    addItem,
    toggleItem,
    removeItem,
    editItem,
    clearChecked,
    reload,
  };
}

export function usePackingSuggestionsQuery(
  tripId: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: packingKeys.suggestions(tripId),
    queryFn: () => getPackingSuggestions(tripId),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

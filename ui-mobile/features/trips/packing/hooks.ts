import { useCallback, useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  createPackingItem,
  deletePackingItem,
  getPackingItems,
  getPackingSuggestions,
  updatePackingItem,
  type PackingItem,
} from "./api";

type PackingState = {
  loading: boolean;
  error: string | null;
  items: PackingItem[];
};

type PackingAction =
  | { type: "fetch/start" }
  | { type: "fetch/done"; items: PackingItem[] }
  | { type: "fetch/error"; message: string }
  | { type: "item/add"; item: PackingItem }
  | { type: "item/replace"; previousId: number; item: PackingItem }
  | { type: "item/update"; item: PackingItem }
  | { type: "item/remove"; id: number }
  | { type: "checked/clear" };

function packingReducer(state: PackingState, action: PackingAction): PackingState {
  switch (action.type) {
    case "fetch/start":
      return { ...state, loading: true, error: null };
    case "fetch/done":
      return { loading: false, error: null, items: action.items };
    case "fetch/error":
      return { ...state, loading: false, error: action.message };
    case "item/add":
      return { ...state, items: [...state.items, action.item] };
    case "item/replace":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.previousId ? action.item : i)),
      };
    case "item/update":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.item.id ? action.item : i)),
      };
    case "item/remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "checked/clear":
      return { ...state, items: state.items.filter((i) => !i.checked) };
  }
}

export function usePackingList(tripId: number) {
  const [{ items, loading, error }, dispatch] = useReducer(packingReducer, {
    loading: true,
    error: null,
    items: [],
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "fetch/start" });
    getPackingItems(tripId)
      .then((data) => {
        if (!cancelled) dispatch({ type: "fetch/done", items: data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: "fetch/error",
            message: err instanceof Error ? err.message : "Failed to load packing list",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const addItem = useCallback(
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return null;
      const tempId = -Date.now();
      const optimistic: PackingItem = {
        id: tempId,
        trip_id: tripId,
        label: trimmed,
        checked: false,
        created_at: new Date().toISOString(),
      };
      dispatch({ type: "item/add", item: optimistic });
      try {
        const item = await createPackingItem(tripId, trimmed);
        dispatch({ type: "item/replace", previousId: tempId, item });
        return item;
      } catch (err) {
        dispatch({ type: "item/remove", id: tempId });
        throw err;
      }
    },
    [tripId],
  );

  const toggleItem = useCallback(
    async (id: number) => {
      const current = items.find((i) => i.id === id);
      if (!current) return;
      const optimistic = { ...current, checked: !current.checked };
      dispatch({ type: "item/update", item: optimistic });
      try {
        const updated = await updatePackingItem(tripId, id, { checked: !current.checked });
        dispatch({ type: "item/update", item: updated });
      } catch (err) {
        dispatch({ type: "item/update", item: current });
        throw err;
      }
    },
    [tripId, items],
  );

  const removeItem = useCallback(
    async (id: number) => {
      const removed = items.find((i) => i.id === id);
      dispatch({ type: "item/remove", id });
      try {
        await deletePackingItem(tripId, id);
      } catch (err) {
        if (removed) dispatch({ type: "item/add", item: removed });
        throw err;
      }
    },
    [tripId, items],
  );

  const clearChecked = useCallback(async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    dispatch({ type: "checked/clear" });
    const results = await Promise.allSettled(
      checked.map((i) => deletePackingItem(tripId, i.id)),
    );
    const failed: PackingItem[] = [];
    let firstError: unknown = null;
    for (let idx = 0; idx < results.length; idx++) {
      const outcome = results[idx];
      if (outcome.status === "rejected") {
        failed.push(checked[idx]);
        if (firstError === null) firstError = outcome.reason;
      }
    }
    if (failed.length > 0) {
      for (const item of failed) dispatch({ type: "item/add", item });
      throw firstError instanceof Error ? firstError : new Error("Failed to clear some items.");
    }
  }, [tripId, items]);

  return { items, loading, error, addItem, toggleItem, removeItem, clearChecked };
}

export function usePackingSuggestionsQuery(
  tripId: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["trips", tripId, "packing", "suggestions"],
    queryFn: () => getPackingSuggestions(tripId),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

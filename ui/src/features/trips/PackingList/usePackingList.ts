import { useReducer, useEffect, useCallback } from 'react';
import {
  getPackingItems,
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
  type PackingItem,
} from '../../../shared/api/packing';

export type { PackingItem };

interface UsePackingListReturn {
  items: PackingItem[];
  loading: boolean;
  error: string | null;
  addItem: (label: string) => Promise<void>;
  toggleItem: (id: number) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  clearChecked: () => Promise<void>;
}

type PackingState = { loading: boolean; error: string | null; items: PackingItem[] };
type PackingAction =
  | { type: 'fetch/start' }
  | { type: 'fetch/done'; items: PackingItem[] }
  | { type: 'fetch/error'; message: string }
  | { type: 'item/add'; item: PackingItem }
  | { type: 'item/replace'; previousId: number; item: PackingItem }
  | { type: 'item/update'; item: PackingItem }
  | { type: 'item/remove'; id: number }
  | { type: 'checked/clear' };

function packingReducer(state: PackingState, action: PackingAction): PackingState {
  switch (action.type) {
    case 'fetch/start':   return { ...state, loading: true, error: null };
    case 'fetch/done':    return { loading: false, error: null, items: action.items };
    case 'fetch/error':   return { ...state, loading: false, error: action.message };
    case 'item/add':      return { ...state, items: [...state.items, action.item] };
    case 'item/replace':  return { ...state, items: state.items.map((i) => (i.id === action.previousId ? action.item : i)) };
    case 'item/update':   return { ...state, items: state.items.map((i) => (i.id === action.item.id ? action.item : i)) };
    case 'item/remove':   return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'checked/clear': return { ...state, items: state.items.filter((i) => !i.checked) };
  }
}

export function usePackingList(token: string, tripId: number): UsePackingListReturn {
  const [{ items, loading, error }, dispatch] = useReducer(packingReducer, {
    loading: true, error: null, items: [],
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'fetch/start' });
    getPackingItems(token, tripId)
      .then((data) => { if (!cancelled) dispatch({ type: 'fetch/done', items: data }); })
      .catch((err) => { if (!cancelled) dispatch({ type: 'fetch/error', message: err instanceof Error ? err.message : 'Failed to load' }); });
    return () => { cancelled = true; };
  }, [token, tripId]);

  const addItem = useCallback(async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const tempId = -Date.now();
    const optimistic: PackingItem = {
      id: tempId,
      trip_id: tripId,
      label: trimmed,
      checked: false,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'item/add', item: optimistic });
    try {
      const item = await createPackingItem(token, tripId, trimmed);
      dispatch({ type: 'item/replace', previousId: tempId, item });
    } catch (error) {
      dispatch({ type: 'item/remove', id: tempId });
      throw error;
    }
  }, [token, tripId]);

  const toggleItem = useCallback(async (id: number) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const optimistic = { ...current, checked: !current.checked };
    dispatch({ type: 'item/update', item: optimistic });
    try {
      const updated = await updatePackingItem(token, tripId, id, { checked: !current.checked });
      dispatch({ type: 'item/update', item: updated });
    } catch (error) {
      dispatch({ type: 'item/update', item: current });
      throw error;
    }
  }, [token, tripId, items]);

  const removeItem = useCallback(async (id: number) => {
    const removed = items.find((i) => i.id === id);
    dispatch({ type: 'item/remove', id });
    try {
      await deletePackingItem(token, tripId, id);
    } catch (error) {
      if (removed) dispatch({ type: 'item/add', item: removed });
      throw error;
    }
  }, [items, token, tripId]);

  const clearChecked = useCallback(async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;
    const snapshot = items;
    try {
      dispatch({ type: 'checked/clear' });
      await Promise.all(checked.map((i) => deletePackingItem(token, tripId, i.id)));
    } catch (error) {
      dispatch({ type: 'fetch/done', items: snapshot });
      throw error;
    }
  }, [token, tripId, items]);

  return { items, loading, error, addItem, toggleItem, removeItem, clearChecked };
}

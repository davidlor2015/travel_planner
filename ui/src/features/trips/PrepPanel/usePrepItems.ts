import { useCallback, useEffect, useReducer } from 'react';
import {
  createPrepItem,
  deletePrepItem,
  getPrepItems,
  updatePrepItem,
  type PrepItem,
  type PrepItemPayload,
} from '../../../shared/api/prep';

interface PrepState {
  items: PrepItem[];
  loading: boolean;
  error: string | null;
}

type PrepAction =
  | { type: 'fetch/start' }
  | { type: 'fetch/done'; items: PrepItem[] }
  | { type: 'fetch/error'; message: string }
  | { type: 'item/add'; item: PrepItem }
  | { type: 'item/update'; item: PrepItem }
  | { type: 'item/replace'; previousId: number; item: PrepItem }
  | { type: 'item/remove'; id: number };

function sortPrepItems(items: PrepItem[]): PrepItem[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

function prepReducer(state: PrepState, action: PrepAction): PrepState {
  switch (action.type) {
    case 'fetch/start':
      return { ...state, loading: true, error: null };
    case 'fetch/done':
      return { items: action.items, loading: false, error: null };
    case 'fetch/error':
      return { ...state, loading: false, error: action.message };
    case 'item/add':
      return { ...state, items: sortPrepItems([...state.items, action.item]) };
    case 'item/update':
      return { ...state, items: sortPrepItems(state.items.map((item) => (item.id === action.item.id ? action.item : item))) };
    case 'item/replace':
      return {
        ...state,
        items: sortPrepItems(state.items.map((item) => (item.id === action.previousId ? action.item : item))),
      };
    case 'item/remove':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
  }
}

export function usePrepItems(token: string, tripId: number) {
  const [{ items, loading, error }, dispatch] = useReducer(prepReducer, {
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'fetch/start' });
    getPrepItems(token, tripId)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'fetch/done', items: sortPrepItems(data) });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: 'fetch/error', message: err instanceof Error ? err.message : 'Failed to load prep items' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

  const addItem = useCallback(async (payload: PrepItemPayload) => {
    const tempId = -Date.now();
    const optimistic: PrepItem = {
      id: tempId,
      trip_id: tripId,
      title: payload.title,
      prep_type: payload.prep_type ?? 'checklist',
      due_date: payload.due_date ?? null,
      notes: payload.notes ?? null,
      completed: false,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'item/add', item: optimistic });
    try {
      const item = await createPrepItem(token, tripId, payload);
      dispatch({ type: 'item/replace', previousId: tempId, item });
    } catch (error) {
      dispatch({ type: 'item/remove', id: tempId });
      throw error;
    }
  }, [token, tripId]);

  const toggleItem = useCallback(async (item: PrepItem) => {
    const optimistic = { ...item, completed: !item.completed };
    dispatch({ type: 'item/update', item: optimistic });
    try {
      const updated = await updatePrepItem(token, tripId, item.id, { completed: !item.completed });
      dispatch({ type: 'item/update', item: updated });
    } catch (error) {
      dispatch({ type: 'item/update', item });
      throw error;
    }
  }, [token, tripId]);

  const removeItem = useCallback(async (prepItemId: number) => {
    const removed = items.find((item) => item.id === prepItemId);
    dispatch({ type: 'item/remove', id: prepItemId });
    try {
      await deletePrepItem(token, tripId, prepItemId);
    } catch (error) {
      if (removed) {
        dispatch({ type: 'item/add', item: removed });
      }
      throw error;
    }
  }, [items, token, tripId]);

  return { items, loading, error, addItem, toggleItem, removeItem };
}

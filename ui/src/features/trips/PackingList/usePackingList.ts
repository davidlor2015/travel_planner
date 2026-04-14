import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackingItem {
  id: string;
  label: string;
  checked: boolean;
}

interface UsePackingListReturn {
  items: PackingItem[];
  addItem: (label: string) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearChecked: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function storageKey(tripId: number): string {
  return `packing_${tripId}`;
}

function isPackingItem(value: unknown): value is PackingItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.checked === 'boolean'
  );
}

function loadItems(tripId: number): PackingItem[] {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPackingItem);
  } catch {
    return [];
  }
}

function saveItems(tripId: number, items: PackingItem[]): void {
  localStorage.setItem(storageKey(tripId), JSON.stringify(items));
}

export function usePackingList(tripId: number): UsePackingListReturn {
  // Lazy initializer handles the load — no separate load effect needed
  // since tripId is fixed per PackingList instance in the current UI.
  const [items, setItems] = useState<PackingItem[]>(() => loadItems(tripId));

  // Persist every change
  useEffect(() => {
    saveItems(tripId, items);
  }, [tripId, items]);

  const addItem = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, label: trimmed, checked: false },
    ]);
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.checked));
  }, []);

  return { items, addItem, toggleItem, removeItem, clearChecked };
}

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'activities' | 'other';

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
}

interface BudgetData {
  limit: number | null;
  expenses: Expense[];
}

export interface UseBudgetTrackerReturn {
  limit: number | null;
  expenses: Expense[];
  totalSpent: number;
  remaining: number | null;
  isOverBudget: boolean;
  setLimit: (amount: number | null) => void;
  addExpense: (label: string, amount: number, category: ExpenseCategory) => void;
  removeExpense: (id: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'stay', 'activities', 'other',
];

// ── Type guards ───────────────────────────────────────────────────────────────

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.amount === 'number' &&
    VALID_CATEGORIES.includes(v.category as ExpenseCategory)
  );
}

function isBudgetData(value: unknown): value is BudgetData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.limit === null || typeof v.limit === 'number') &&
    Array.isArray(v.expenses)
  );
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function storageKey(tripId: number): string {
  return `budget_${tripId}`;
}

function loadData(tripId: number): BudgetData {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return { limit: null, expenses: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isBudgetData(parsed)) return { limit: null, expenses: [] };
    return { limit: parsed.limit, expenses: parsed.expenses.filter(isExpense) };
  } catch {
    return { limit: null, expenses: [] };
  }
}

function saveData(tripId: number, data: BudgetData): void {
  localStorage.setItem(storageKey(tripId), JSON.stringify(data));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBudgetTracker(tripId: number): UseBudgetTrackerReturn {
  const [data, setData] = useState<BudgetData>(() => loadData(tripId));

  // Persist every change
  useEffect(() => {
    saveData(tripId, data);
  }, [tripId, data]);

  const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining  = data.limit !== null ? data.limit - totalSpent : null;
  const isOverBudget = remaining !== null && remaining < 0;

  const setLimit = useCallback((amount: number | null) => {
    setData((prev) => ({ ...prev, limit: amount }));
  }, []);

  const addExpense = useCallback((label: string, amount: number, category: ExpenseCategory) => {
    const trimmed = label.trim();
    if (!trimmed || amount <= 0) return;
    setData((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        { id: `${Date.now()}-${Math.random()}`, label: trimmed, amount, category },
      ],
    }));
  }, []);

  const removeExpense = useCallback((id: string) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
  }, []);

  return { limit: data.limit, expenses: data.expenses, totalSpent, remaining, isOverBudget, setLimit, addExpense, removeExpense };
}

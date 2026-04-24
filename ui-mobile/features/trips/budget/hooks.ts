import { useCallback, useEffect, useReducer } from "react";

import {
  createExpense,
  deleteExpense,
  getBudget,
  updateBudgetLimit,
  type BudgetData,
  type BudgetExpense,
} from "./api";

type BudgetState = {
  loading: boolean;
  error: string | null;
  limit: number | null;
  expenses: BudgetExpense[];
};

type BudgetAction =
  | { type: "fetch/start" }
  | { type: "fetch/done"; limit: number | null; expenses: BudgetExpense[] }
  | { type: "fetch/error"; message: string }
  | { type: "limit/set"; data: BudgetData }
  | { type: "expense/add"; expense: BudgetExpense }
  | { type: "expense/replace"; previousId: number; expense: BudgetExpense }
  | { type: "expense/remove"; id: number };

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case "fetch/start":
      return { ...state, loading: true, error: null };
    case "fetch/done":
      return { loading: false, error: null, limit: action.limit, expenses: action.expenses };
    case "fetch/error":
      return { ...state, loading: false, error: action.message };
    case "limit/set":
      return { ...state, limit: action.data.limit, expenses: action.data.expenses };
    case "expense/add":
      return { ...state, expenses: [...state.expenses, action.expense] };
    case "expense/replace":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.previousId ? action.expense : e,
        ),
      };
    case "expense/remove":
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };
  }
}

export type ExpenseCategory = "food" | "transport" | "stay" | "activities" | "other";

export function useBudgetTracker(tripId: number) {
  const [{ loading, error, limit, expenses }, dispatch] = useReducer(
    budgetReducer,
    { loading: true, error: null, limit: null, expenses: [] },
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "fetch/start" });
    getBudget(tripId)
      .then((data) => {
        if (!cancelled)
          dispatch({ type: "fetch/done", limit: data.limit, expenses: data.expenses });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: "fetch/error",
            message: err instanceof Error ? err.message : "Failed to load budget",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = limit !== null ? limit - totalSpent : null;
  const isOverBudget = remaining !== null && remaining < 0;

  const setLimit = useCallback(
    async (amount: number | null) => {
      const snapshot = { limit, expenses };
      dispatch({ type: "limit/set", data: { limit: amount, expenses } });
      try {
        const data = await updateBudgetLimit(tripId, amount);
        dispatch({ type: "limit/set", data });
      } catch (err) {
        dispatch({ type: "limit/set", data: snapshot });
        throw err;
      }
    },
    [tripId, limit, expenses],
  );

  const addExpense = useCallback(
    async (label: string, amount: number, category: ExpenseCategory) => {
      const trimmed = label.trim();
      if (!trimmed || amount <= 0) return;
      const tempId = -Date.now();
      const optimistic: BudgetExpense = {
        id: tempId,
        trip_id: tripId,
        label: trimmed,
        amount,
        category,
        created_at: new Date().toISOString(),
      };
      dispatch({ type: "expense/add", expense: optimistic });
      try {
        const expense = await createExpense(tripId, { label: trimmed, amount, category });
        dispatch({ type: "expense/replace", previousId: tempId, expense });
      } catch (err) {
        dispatch({ type: "expense/remove", id: tempId });
        throw err;
      }
    },
    [tripId],
  );

  const removeExpense = useCallback(
    async (id: number) => {
      const removed = expenses.find((e) => e.id === id);
      dispatch({ type: "expense/remove", id });
      try {
        await deleteExpense(tripId, id);
      } catch (err) {
        if (removed) dispatch({ type: "expense/add", expense: removed });
        throw err;
      }
    },
    [tripId, expenses],
  );

  return {
    limit,
    expenses,
    totalSpent,
    remaining,
    isOverBudget,
    loading,
    error,
    setLimit,
    addExpense,
    removeExpense,
  };
}

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createExpense,
  deleteExpense,
  getBudget,
  updateBudgetLimit,
  type BudgetData,
  type BudgetExpense,
} from "./api";
import { tripKeys } from "../hooks";
import { toLocalNoonISOString } from "./adapters";

export const budgetKeys = {
  detail: (tripId: number) => ["trips", tripId, "budget"] as const,
};

export type ExpenseCategory = "food" | "transport" | "stay" | "activities" | "other";

export function useBudgetTracker(tripId: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: budgetKeys.detail(tripId),
    queryFn: () => getBudget(tripId),
  });

  const data: BudgetData = query.data ?? { limit: null, expenses: [] };
  const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = data.limit !== null ? data.limit - totalSpent : null;

  const invalidateSummaries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) }),
      queryClient.invalidateQueries({ queryKey: tripKeys.summaries }),
    ]);
  };

  const setLimitMutation = useMutation({
    mutationFn: (amount: number | null) => updateBudgetLimit(tripId, amount),
    onMutate: async (amount) => {
      await queryClient.cancelQueries({ queryKey: budgetKeys.detail(tripId) });
      const prev = queryClient.getQueryData<BudgetData>(budgetKeys.detail(tripId));
      queryClient.setQueryData<BudgetData>(budgetKeys.detail(tripId), (old) =>
        old ? { ...old, limit: amount } : { limit: amount, expenses: [] },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(budgetKeys.detail(tripId), ctx.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<BudgetData>(budgetKeys.detail(tripId), updated);
      void invalidateSummaries();
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: ({
      label,
      amount,
      category,
      createdAtOverride,
    }: {
      label: string;
      amount: number;
      category: string;
      createdAtOverride?: string;
    }) => createExpense(tripId, { label, amount, category }),
    onMutate: async ({ label, amount, category, createdAtOverride }) => {
      await queryClient.cancelQueries({ queryKey: budgetKeys.detail(tripId) });
      const prev = queryClient.getQueryData<BudgetData>(budgetKeys.detail(tripId));
      const tempId = -Date.now();
      const optimistic: BudgetExpense = {
        id: tempId,
        trip_id: tripId,
        label,
        amount,
        category,
        created_at: createdAtOverride
          ? toLocalNoonISOString(createdAtOverride)
          : new Date().toISOString(),
      };
      queryClient.setQueryData<BudgetData>(budgetKeys.detail(tripId), (old) =>
        old
          ? { ...old, expenses: [...old.expenses, optimistic] }
          : { limit: null, expenses: [optimistic] },
      );
      return { prev, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(budgetKeys.detail(tripId), ctx.prev);
    },
    onSuccess: (expense, _vars, ctx) => {
      queryClient.setQueryData<BudgetData>(budgetKeys.detail(tripId), (old) => {
        if (!old) return old;
        return {
          ...old,
          expenses: old.expenses.map((e) => (e.id === ctx?.tempId ? expense : e)),
        };
      });
      void invalidateSummaries();
    },
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (expenseId: number) => deleteExpense(tripId, expenseId),
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: budgetKeys.detail(tripId) });
      const prev = queryClient.getQueryData<BudgetData>(budgetKeys.detail(tripId));
      queryClient.setQueryData<BudgetData>(budgetKeys.detail(tripId), (old) =>
        old ? { ...old, expenses: old.expenses.filter((e) => e.id !== expenseId) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(budgetKeys.detail(tripId), ctx.prev);
    },
    onSuccess: () => {
      void invalidateSummaries();
    },
  });

  const setLimit = useCallback(
    (amount: number | null) => setLimitMutation.mutateAsync(amount),
    [setLimitMutation],
  );

  const addExpense = useCallback(
    (
      label: string,
      amount: number,
      category: ExpenseCategory,
      createdAtOverride?: string,
    ) =>
      addExpenseMutation.mutateAsync({
        label,
        amount,
        category,
        createdAtOverride,
      }),
    [addExpenseMutation],
  );

  const removeExpense = useCallback(
    (id: number) => removeExpenseMutation.mutateAsync(id),
    [removeExpenseMutation],
  );

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: budgetKeys.detail(tripId) }),
    [queryClient, tripId],
  );

  return {
    limit: data.limit,
    expenses: data.expenses,
    totalSpent,
    remaining,
    isOverBudget: remaining !== null && remaining < 0,
    loading: query.isLoading,
    error: query.isError ? "We couldn't load the budget. Try again in a moment." : null,
    setLimit,
    addExpense,
    removeExpense,
    reload,
  };
}

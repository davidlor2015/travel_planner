// Path: ui-mobile/features/trips/budget/api.ts
// Summary: Implements api module logic.

import { ApiError, apiFetch, apiRequest } from "@/shared/api/client";

export type BudgetExpense = {
  id: number;
  trip_id: number;
  label: string;
  amount: number;
  category: string;
  created_at: string;
};

export type BudgetData = {
  limit: number | null;
  expenses: BudgetExpense[];
};

export async function getBudget(tripId: number): Promise<BudgetData> {
  return apiRequest<BudgetData>(`/v1/trips/${tripId}/budget/`);
}

export async function updateBudgetLimit(
  tripId: number,
  limit: number | null,
): Promise<BudgetData> {
  return apiRequest<BudgetData>(`/v1/trips/${tripId}/budget/limit`, {
    method: "PATCH",
    body: { limit },
  });
}

export async function createExpense(
  tripId: number,
  expense: { label: string; amount: number; category: string },
): Promise<BudgetExpense> {
  return apiRequest<BudgetExpense>(`/v1/trips/${tripId}/budget/expenses`, {
    method: "POST",
    body: expense,
  });
}

export async function deleteExpense(
  tripId: number,
  expenseId: number,
): Promise<void> {
  const res = await apiFetch(`/v1/trips/${tripId}/budget/expenses/${expenseId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await ApiError.fromResponse(res, "Failed to delete expense");
}

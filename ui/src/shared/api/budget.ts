import { API_URL } from '../../app/config';
import { apiFetch } from './client';
import { ApiError } from './errors';

export interface BudgetExpense {
  id: number;
  trip_id: number;
  label: string;
  amount: number;
  category: string;
  created_at: string;
}

export interface BudgetData {
  limit: number | null;
  expenses: BudgetExpense[];
}

const base = (tripId: number) => `${API_URL}/v1/trips/${tripId}/budget`;

export async function getBudget(token: string, tripId: number): Promise<BudgetData> {
  const res = await apiFetch(`${base(tripId)}/`, { token, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw await ApiError.fromResponse(res, 'Failed to load budget');
  return res.json();
}

export async function updateBudgetLimit(token: string, tripId: number, limit: number | null): Promise<BudgetData> {
  const res = await apiFetch(`${base(tripId)}/limit`, {
    method: 'PATCH',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) throw await ApiError.fromResponse(res, 'Failed to update budget limit');
  return res.json();
}

export async function createExpense(
  token: string,
  tripId: number,
  expense: { label: string; amount: number; category: string },
): Promise<BudgetExpense> {
  const res = await apiFetch(`${base(tripId)}/expenses`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) throw await ApiError.fromResponse(res, 'Failed to add expense');
  return res.json();
}

export async function deleteExpense(token: string, tripId: number, expenseId: number): Promise<void> {
  const res = await apiFetch(`${base(tripId)}/expenses/${expenseId}`, {
    method: 'DELETE',
    token,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw await ApiError.fromResponse(res, 'Failed to delete expense');
}

export type TripStatus = 'upcoming' | 'active' | 'past';

export interface PackingSummary {
  total: number;
  checked: number;
  progressPct: number;
  loading: boolean;
}

export interface BudgetSummary {
  limit: number | null;
  totalSpent: number;
  remaining: number | null;
  isOverBudget: boolean;
  expenseCount: number;
  loading: boolean;
}

export interface ReservationSummary {
  total: number;
  upcoming: number;
  loading: boolean;
}

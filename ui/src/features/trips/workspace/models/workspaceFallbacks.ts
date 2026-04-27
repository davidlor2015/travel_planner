// Path: ui/src/features/trips/workspace/models/workspaceFallbacks.ts
// Summary: Defines the workspaceFallbacks data model.

import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../types";

/**
 * UI-layer fallbacks when a trip id has no summary loaded yet.
 * These are not domain entities from the API — they represent "unknown / loading"
 * and empty numeric shells so components can render without branching on null.
 *
 * Prefer calling these factories over shared mutable singletons so nothing
 * accidentally mutates a reused default object.
 */
export function createInitialPackingSummary(): PackingSummary {
  return {
    total: 0,
    checked: 0,
    progressPct: 0,
    loading: true,
  };
}

export function createInitialBudgetSummary(): BudgetSummary {
  return {
    limit: null,
    totalSpent: 0,
    remaining: null,
    isOverBudget: false,
    expenseCount: 0,
    loading: true,
  };
}

export function createInitialReservationSummary(): ReservationSummary {
  return {
    total: 0,
    upcoming: 0,
    loading: true,
  };
}

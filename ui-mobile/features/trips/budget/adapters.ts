import type { BudgetExpense } from "./api";

export function formatBudgetAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function groupExpenseTotal(expenses: BudgetExpense[], category: string): number {
  return expenses
    .filter((expense) => expense.category === category)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

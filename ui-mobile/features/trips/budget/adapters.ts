// Path: ui-mobile/features/trips/budget/adapters.ts
// Summary: Implements adapters module logic.

import type { BudgetExpense } from "./api";
import type { ExpenseCategory } from "./hooks";

export function formatBudgetAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function groupExpenseTotal(expenses: BudgetExpense[], category: string): number {
  return expenses
    .filter((expense) => expense.category === category)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export type BudgetCategoryFilter = "all" | ExpenseCategory;

export type BudgetCategoryMeta = {
  label: string;
  icon: BudgetCategoryIcon;
  badgeClassName: string;
  badgeTextClassName: string;
  iconColor: string;
};

export type BudgetCategoryIcon =
  | "restaurant-outline"
  | "bus-outline"
  | "bed-outline"
  | "walk-outline"
  | "pricetag-outline";

export type BudgetSummaryMetricTone = "default" | "muted" | "danger";

export type BudgetSummaryMetric = {
  key: "spent" | "total" | "remaining";
  label: string;
  value: string;
  tone: BudgetSummaryMetricTone;
};

export type BudgetSummaryViewModel = {
  helperText: string;
  metrics: BudgetSummaryMetric[];
};

export type BudgetCategoryRowViewModel = {
  key: ExpenseCategory;
  label: string;
  amount: number;
  amountLabel: string;
  expenseCount: number;
  expenseCountLabel: string;
  isEmpty: boolean;
  emptyStateLabel: string;
};

export type BudgetTransactionRowViewModel = {
  id: number;
  label: string;
  amountLabel: string;
  category: ExpenseCategory;
  categoryLabel: string;
  categoryIcon: BudgetCategoryIcon;
  dateLabel: string;
  subtitle: string;
};

export const BUDGET_CATEGORY_ORDER: ExpenseCategory[] = [
  "food",
  "transport",
  "stay",
  "activities",
  "other",
];

const BUDGET_CATEGORY_META: Record<ExpenseCategory, BudgetCategoryMeta> = {
  food: {
    label: "Food",
    icon: "restaurant-outline",
    badgeClassName: "border border-amber/30 bg-amber/10",
    badgeTextClassName: "text-amber",
    iconColor: "#B86845",
  },
  transport: {
    label: "Transport",
    icon: "bus-outline",
    badgeClassName: "border border-espresso/20 bg-espresso/10",
    badgeTextClassName: "text-espresso",
    iconColor: "#1C1108",
  },
  stay: {
    label: "Stay",
    icon: "bed-outline",
    badgeClassName: "border border-clay/25 bg-clay/10",
    badgeTextClassName: "text-clay",
    iconColor: "#6B5E52",
  },
  activities: {
    label: "Activities",
    icon: "walk-outline",
    badgeClassName: "border border-olive/25 bg-olive/10",
    badgeTextClassName: "text-olive",
    iconColor: "#6A7A43",
  },
  other: {
    label: "Other",
    icon: "pricetag-outline",
    badgeClassName: "border border-border-strong bg-surface-muted",
    badgeTextClassName: "text-text-muted",
    iconColor: "#8A7E74",
  },
};

function toTimestamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatExpenseCount(count: number): string {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

export function todayLocalISODate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeExpenseInputDate(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [yearText, monthText, dayText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return trimmed;
}

export function toLocalNoonISOString(dateIso: string): string {
  const normalized = normalizeExpenseInputDate(dateIso);
  if (!normalized) return new Date().toISOString();
  const [yearText, monthText, dayText] = normalized.split("-");
  const localNoon = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    12,
    0,
    0,
    0,
  );
  if (Number.isNaN(localNoon.getTime())) return new Date().toISOString();
  return localNoon.toISOString();
}

export function formatExpenseComposerDate(dateIso: string): string {
  const normalized = normalizeExpenseInputDate(dateIso);
  if (!normalized) return "Today";
  const [yearText, monthText, dayText] = normalized.split("-");
  const localDate = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  if (Number.isNaN(localDate.getTime())) return "Today";
  return localDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toExpenseCategory(rawCategory: string | null | undefined): ExpenseCategory {
  if (rawCategory === "food") return "food";
  if (rawCategory === "transport") return "transport";
  if (rawCategory === "stay") return "stay";
  if (rawCategory === "activities") return "activities";
  return "other";
}

export function getBudgetCategoryMeta(category: ExpenseCategory): BudgetCategoryMeta {
  return BUDGET_CATEGORY_META[category];
}

export function getCategoryFilterLabel(filter: BudgetCategoryFilter): string {
  if (filter === "all") return "All categories";
  return getBudgetCategoryMeta(filter).label;
}

export function formatExpenseDateLabel(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function buildBudgetSummaryViewModel(
  limit: number | null,
  totalSpent: number,
): BudgetSummaryViewModel {
  const remaining = limit !== null ? limit - totalSpent : null;

  const remainingMetric: BudgetSummaryMetric =
    remaining === null
      ? {
          key: "remaining",
          label: "Remaining budget",
          value: "Set total budget",
          tone: "muted",
        }
      : remaining >= 0
        ? {
            key: "remaining",
            label: "Remaining budget",
            value: formatBudgetAmount(remaining),
            tone: "default",
          }
        : {
            key: "remaining",
            label: "Over budget by",
            value: formatBudgetAmount(Math.abs(remaining)),
            tone: "danger",
          };

  return {
    helperText:
      limit === null
        ? "Set a total budget to see remaining spend at a glance."
        : `${formatBudgetAmount(totalSpent)} spent of ${formatBudgetAmount(limit)} total.`,
    metrics: [
      {
        key: "spent",
        label: "Spent so far",
        value: formatBudgetAmount(totalSpent),
        tone: "default",
      },
      {
        key: "total",
        label: "Total budget",
        value: limit !== null ? formatBudgetAmount(limit) : "Not set",
        tone: limit !== null ? "default" : "muted",
      },
      remainingMetric,
    ],
  };
}

export function buildBudgetCategoryRows(
  expenses: BudgetExpense[],
): BudgetCategoryRowViewModel[] {
  return BUDGET_CATEGORY_ORDER.map((category) => {
    const normalizedExpenses = expenses.filter(
      (expense) => toExpenseCategory(expense.category) === category,
    );
    const total = normalizedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = normalizedExpenses.length;

    return {
      key: category,
      label: getBudgetCategoryMeta(category).label,
      amount: total,
      amountLabel: formatBudgetAmount(total),
      expenseCount,
      expenseCountLabel: formatExpenseCount(expenseCount),
      isEmpty: expenseCount === 0,
      emptyStateLabel: "No expenses yet.",
    };
  });
}

export function buildBudgetTransactionRows(
  expenses: BudgetExpense[],
  filter: BudgetCategoryFilter,
): BudgetTransactionRowViewModel[] {
  return [...expenses]
    .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at) || b.id - a.id)
    .filter((expense) => {
      const category = toExpenseCategory(expense.category);
      return filter === "all" ? true : category === filter;
    })
    .map((expense) => {
      const category = toExpenseCategory(expense.category);
      const categoryMeta = getBudgetCategoryMeta(category);
      const dateLabel = formatExpenseDateLabel(expense.created_at);

      return {
        id: expense.id,
        label: expense.label.trim() || "Untitled expense",
        amountLabel: formatBudgetAmount(expense.amount),
        category,
        categoryLabel: categoryMeta.label,
        categoryIcon: categoryMeta.icon,
        dateLabel,
        subtitle: `${categoryMeta.label} \u00b7 ${dateLabel}`,
      };
    });
}

export function buildFilteredTransactionEmptyLabel(
  filter: BudgetCategoryFilter,
): string {
  if (filter === "all") return "No expenses yet. Add one to start tracking spend.";
  return `No ${getCategoryFilterLabel(filter).toLowerCase()} expenses yet.`;
}

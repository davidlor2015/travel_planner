import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBudgetTracker, type ExpenseCategory } from "./useBudgetTracker";
import { Toast } from "../../../shared/ui/Toast";
import { track } from "../../../shared/analytics";

interface BudgetTrackerProps {
  token: string;
  tripId: number;
  onSummaryChange?: (summary: {
    limit: number | null;
    totalSpent: number;
    remaining: number | null;
    isOverBudget: boolean;
    expenseCount: number;
    loading: boolean;
  }) => void;
}

const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  activeCls: string;
  pillCls: string;
  barCls: string;
}[] = [
  {
    value: "food",
    label: "Food",
    activeCls: "bg-amber text-white border-amber",
    pillCls: "bg-amber/15 text-amber border-amber/30",
    barCls: "bg-amber",
  },
  {
    value: "transport",
    label: "Transport",
    activeCls: "bg-espresso text-white border-espresso",
    pillCls: "bg-espresso/10 text-espresso border-espresso/20",
    barCls: "bg-[#6A4B3C]",
  },
  {
    value: "stay",
    label: "Stay",
    activeCls: "bg-clay text-white border-clay",
    pillCls: "bg-clay/10 text-clay border-clay/25",
    barCls: "bg-clay",
  },
  {
    value: "activities",
    label: "Activities",
    activeCls: "bg-olive text-white border-olive",
    pillCls: "bg-olive/10 text-olive border-olive/25",
    barCls: "bg-olive",
  },
  {
    value: "other",
    label: "Other",
    activeCls: "bg-espresso/80 text-white border-espresso/60",
    pillCls: "bg-parchment text-flint border-smoke",
    barCls: "bg-[#B7AAA0]",
  },
];

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, bounce: 0.3, duration: 0.4 },
  },
  exit: { opacity: 0, x: 12, transition: { duration: 0.18 } },
};

function formatAmount(amount: number): string {
  const isWhole = Number.isInteger(amount);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(amount: number): string {
  return `$${formatAmount(amount)}`;
}

function CurrencyDisplay({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={className}>
      <span className="mr-0.5 text-[13px] font-normal opacity-50">$</span>
      {formatAmount(amount)}
    </span>
  );
}

function progressBarCls(pct: number): string {
  if (pct >= 100) return "bg-danger";
  if (pct >= 75) return "bg-amber";
  return "bg-olive";
}

function formatExpenseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export const BudgetTracker = ({
  token,
  tripId,
  onSummaryChange,
}: BudgetTrackerProps) => {
  const {
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
  } = useBudgetTracker(token, tripId);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftCategory, setDraftCategory] = useState<ExpenseCategory>("other");
  const [draftLimit, setDraftLimit] = useState("");
  const [editingLimit, setEditingLimit] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const spentPct = limit ? Math.min((totalSpent / limit) * 100, 100) : 0;
  const canAdd = draftLabel.trim().length > 0 && Number(draftAmount) > 0;

  const categoryBreakdown = useMemo(() => {
    const totals = CATEGORIES.map((category) => {
      const total = expenses
        .filter((expense) => expense.category === category.value)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        ...category,
        total,
      };
    }).filter((category) => category.total > 0);

    return totals.map((category) => ({
      ...category,
      pct: totalSpent > 0 ? (category.total / totalSpent) * 100 : 0,
    }));
  }, [expenses, totalSpent]);

  const sortedRecentExpenses = useMemo(
    () =>
      [...expenses].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [expenses],
  );

  useEffect(() => {
    onSummaryChange?.({
      limit,
      totalSpent,
      remaining,
      isOverBudget,
      expenseCount: expenses.length,
      loading,
    });
  }, [
    expenses.length,
    isOverBudget,
    limit,
    loading,
    onSummaryChange,
    remaining,
    totalSpent,
  ]);

  const handleSaveLimit = useCallback(async () => {
    const parsed = parseFloat(draftLimit);
    if (!isNaN(parsed) && parsed > 0) {
      setFeedback(null);
      setActionError(null);
      try {
        await setLimit(parsed);
        setEditingLimit(false);
        setFeedback("Budget updated.");
        track({
          name: "budget_limit_updated",
          props: {
            trip_id: tripId,
            has_previous_limit: limit !== null,
            limit_amount: parsed,
          },
        });
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to update budget.",
        );
        return;
      }
    }
  }, [draftLimit, limit, setLimit, tripId]);

  const handleLimitKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSaveLimit();
      if (e.key === "Escape") setEditingLimit(false);
    },
    [handleSaveLimit],
  );

  const handleAddExpense = useCallback(async () => {
    const amount = parseFloat(draftAmount);
    setFeedback(null);
    setActionError(null);
    try {
      await addExpense(draftLabel, amount, draftCategory);
      setDraftLabel("");
      setDraftAmount("");
      setShowExpenseForm(false);
      setFeedback("Expense added.");
      track({
        name: "budget_expense_added",
        props: {
          trip_id: tripId,
          category: draftCategory,
          amount,
        },
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to add expense.",
      );
      return;
    }
  }, [addExpense, draftLabel, draftAmount, draftCategory, tripId]);

  const handleExpenseKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleAddExpense();
    },
    [handleAddExpense],
  );

  const categoryMeta = (cat: ExpenseCategory) =>
    CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[4];

  const openBudgetLimitEditor = () => {
    setDraftLimit(String(limit ?? ""));
    setEditingLimit(true);
    track({
      name: "budget_limit_edit_opened",
      props: {
        trip_id: tripId,
        has_limit: limit !== null,
      },
    });
  };

  const toggleExpenseForm = () => {
    setShowExpenseForm((prev) => {
      const next = !prev;
      if (next) {
        track({
          name: "budget_expense_form_opened",
          props: {
            trip_id: tripId,
          },
        });
      }
      return next;
    });
  };

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-[#E6DED1] bg-[#FBF8F4]">
      <div className="border-b border-[#EFE6DB] px-5 pb-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-espresso">Trip budget</h4>
            <p className="mt-0.5 text-xs text-flint">
              A simple spending view for this trip.
            </p>
            <p className="mt-1 text-xs text-flint">
              Personal to you. Bookings stay shared in the trip workspace.
            </p>
            {loading ? (
              <p className="mt-1 text-xs text-flint">Loading…</p>
            ) : limit !== null && !editingLimit ? (
              <p
                className={[
                  "mt-1 text-xs font-semibold",
                  isOverBudget ? "text-danger" : "text-[#4A5A47]",
                ].join(" ")}
              >
                {isOverBudget
                  ? `${formatCurrency(Math.abs(remaining ?? 0))} over budget`
                  : `${formatCurrency(remaining ?? 0)} remaining`}
              </p>
            ) : null}
          </div>

          {editingLimit ? (
            <div className="flex items-center gap-1.5">
              <label htmlFor="budget-limit-input" className="sr-only">
                Budget limit in dollars
              </label>
              <span
                className="text-sm font-medium text-flint"
                aria-hidden="true"
              >
                $
              </span>
              <input
                id="budget-limit-input"
                type="number"
                min="0"
                step="1"
                value={draftLimit}
                onChange={(e) => setDraftLimit(e.target.value)}
                onKeyDown={handleLimitKeyDown}
                placeholder="Set budget"
                className="w-28 rounded-full border border-amber/40 bg-white px-3 py-1.5 text-sm text-espresso transition-all duration-150 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/40"
                autoFocus
              />
              <motion.button
                onClick={handleSaveLimit}
                disabled={!draftLimit || isNaN(parseFloat(draftLimit))}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer rounded-full bg-amber px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-amber/25 transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Set
              </motion.button>
              {limit !== null ? (
                <button
                  onClick={() => setEditingLimit(false)}
                  className="cursor-pointer text-xs text-flint transition-colors hover:text-espresso"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openBudgetLimitEditor}
                className="cursor-pointer rounded-full border border-[#E3D8CC] bg-white px-3 py-1.5 text-xs font-semibold text-espresso transition-colors hover:border-amber/40"
              >
                {limit !== null
                  ? `Budget: ${formatCurrency(limit)}`
                  : "Set budget"}
              </button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={toggleExpenseForm}
                className="rounded-full bg-amber px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber/25"
              >
                {showExpenseForm ? "Close expense form" : "Add expense"}
              </motion.button>
            </div>
          )}
        </div>

        <div
          className="mt-4 grid gap-2 sm:grid-cols-3"
          aria-label="Budget summary"
        >
          <div className="rounded-2xl border border-[#E9DFD3] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
              Total spent
            </p>
            <CurrencyDisplay
              amount={totalSpent}
              className="mt-1 block font-display text-[22px] font-semibold leading-none text-espresso tabular-nums"
            />
          </div>
          <div className="rounded-2xl border border-[#E9DFD3] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
              Total budget
            </p>
            {limit !== null ? (
              <CurrencyDisplay
                amount={limit}
                className="mt-1 block font-display text-[22px] font-semibold leading-none text-espresso tabular-nums"
              />
            ) : (
              <p className="mt-1 font-display text-[22px] font-semibold leading-none text-espresso">—</p>
            )}
          </div>
          <div className="rounded-2xl border border-[#E9DFD3] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
              Remaining
            </p>
            {remaining !== null ? (
              <CurrencyDisplay
                amount={remaining}
                className={[
                  "mt-1 block font-display text-[22px] font-semibold leading-none tabular-nums",
                  remaining < 0 ? "text-danger" : "text-olive",
                ].join(" ")}
              />
            ) : (
              <p className="mt-1 font-display text-[22px] font-semibold leading-none text-[#A39688]">Set budget</p>
            )}
          </div>
        </div>

        {limit !== null && !editingLimit ? (
          <div className="mt-3" aria-label="Budget progress">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#EDE4D8]">
              <motion.div
                className={`h-full rounded-full transition-colors duration-500 ${progressBarCls(spentPct)}`}
                initial={{ width: 0 }}
                animate={{ width: `${spentPct}%` }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            </div>
          </div>
        ) : null}

        {categoryBreakdown.length > 0 ? (
          <section
            className="mt-4 rounded-2xl border border-[#E9DFD3] bg-white p-3"
            aria-label="Category breakdown"
          >
            <p className="text-sm font-semibold text-espresso">
              Category breakdown
            </p>
            <p className="mt-1 text-xs text-flint">
              See where your trip spending is landing.
            </p>

            <div
              className="mt-3 hidden sm:block"
              role="group"
              aria-label="Segmented category spending chart"
            >
              <div className="flex h-2 overflow-hidden rounded-full bg-[#EEE4D8]">
                {categoryBreakdown.map((category) => (
                  <span
                    key={category.value}
                    className={`${category.barCls} h-full`}
                    style={{ width: `${category.pct}%` }}
                    aria-label={`${category.label}: ${formatCurrency(category.total)} (${Math.round(category.pct)}%)`}
                    title={`${category.label}: ${formatCurrency(category.total)}`}
                  />
                ))}
              </div>
            </div>

            <ul className="mt-3 m-0 list-none space-y-2 p-0">
              {categoryBreakdown.map((category) => (
                <li key={category.value} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-espresso">
                      {category.label}
                    </span>
                    <span className="text-flint tabular-nums">
                      {formatCurrency(category.total)} (
                      {Math.round(category.pct)}%)
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-[#EEE4D8]"
                    aria-hidden="true"
                  >
                    <div
                      className={`${category.barCls} h-full rounded-full`}
                      style={{ width: `${category.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Toast message={feedback} onDismiss={() => setFeedback(null)} />
        {actionError ? (
          <div
            className="mt-3 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {actionError}
          </div>
        ) : null}
      </div>

      {loading && expenses.length === 0 ? (
        <div className="divide-y divide-[#EFE6DB]">
          {[72, 54, 64].map((width, index) => (
            <div key={index} className="animate-pulse px-5 py-4">
              <div className="rounded-2xl border border-[#EEE4D8] bg-white px-4 py-4">
                <div
                  className="h-4 rounded-full bg-smoke/70"
                  style={{ width: `${width}%` }}
                />
                <div className="mt-3 h-3 w-28 rounded-full bg-parchment" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-5 py-8">
          <div
            className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm"
            role="alert"
          >
            <p className="font-semibold text-danger">
              Budget details unavailable
            </p>
            <p className="mt-1 text-flint">{error}</p>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-semibold text-espresso">
            {limit === null
              ? "No budget guardrail yet"
              : "No expenses recorded yet"}
          </p>
          <p className="mt-1 text-sm text-flint">
            {limit === null
              ? "Set a budget or add the first expense so this trip has a clear spending baseline."
              : "Your limit is in place. Add the first expense when bookings or purchases start coming in."}
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (limit === null) {
                openBudgetLimitEditor();
                return;
              }
              if (!showExpenseForm) {
                toggleExpenseForm();
              }
            }}
            className="mt-4 inline-flex rounded-full bg-amber px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber/25"
          >
            {limit === null ? "Set trip budget" : "Add first expense"}
          </motion.button>
        </div>
      ) : (
        <>
          <div className="border-b border-[#EFE6DB] px-5 py-4">
            <h5 className="text-sm font-semibold text-espresso">
              Recent expenses
            </h5>
            <p className="mt-1 text-xs text-flint">
              Latest purchases and bookings for this trip.
            </p>
          </div>
          <ul className="m-0 list-none divide-y divide-[#EFE6DB] p-0">
            <AnimatePresence initial={false}>
              {sortedRecentExpenses.map((expense) => {
                const meta = categoryMeta(expense.category as ExpenseCategory);
                return (
                  <motion.li
                    key={expense.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    layout
                    className="px-5 py-3"
                  >
                    <article className="rounded-2xl border border-[#EAE1D4] bg-white px-3 py-3 sm:px-4 sm:py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-espresso">
                          {expense.label}
                        </p>
                        <p className="text-sm font-bold text-espresso tabular-nums">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.pillCls}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs text-flint">
                            {formatExpenseDate(expense.created_at)}
                          </span>
                        </div>
                        <motion.button
                          onClick={async () => {
                            setFeedback(null);
                            setActionError(null);
                            try {
                              await removeExpense(expense.id);
                              setFeedback("Expense removed.");
                              track({
                                name: "budget_expense_removed",
                                props: {
                                  trip_id: tripId,
                                  category: expense.category,
                                  amount: expense.amount,
                                },
                              });
                            } catch (err) {
                              setActionError(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to remove expense.",
                              );
                              return;
                            }
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          aria-label={`Remove expense ${expense.label}`}
                          className="min-h-9 cursor-pointer rounded-full border border-[#E2D9CE] px-3 py-1 text-xs font-semibold text-flint transition-colors hover:border-danger/35 hover:text-danger"
                        >
                          Remove
                        </motion.button>
                      </div>
                    </article>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}

      <AnimatePresence initial={false}>
        {showExpenseForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#EFE6DB]"
          >
            <div className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ value, label, activeCls, pillCls }) => (
                  <motion.button
                    key={value}
                    onClick={() => setDraftCategory(value)}
                    whileTap={{ scale: 0.93 }}
                    className={[
                      "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-bold transition-colors duration-150",
                      draftCategory === value ? activeCls : pillCls,
                    ].join(" ")}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="budget-expense-label" className="sr-only">
                  What did you spend on?
                </label>
                <input
                  id="budget-expense-label"
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={handleExpenseKeyDown}
                  placeholder="What did you spend on?"
                  className="min-w-0 flex-1 rounded-full border border-smoke bg-white px-4 py-2 text-sm text-espresso transition-all duration-150 placeholder:text-flint focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/40"
                />
                <label htmlFor="budget-expense-amount" className="sr-only">
                  Amount in dollars
                </label>
                <input
                  id="budget-expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  onKeyDown={handleExpenseKeyDown}
                  placeholder="$0"
                  className="w-full rounded-full border border-smoke bg-white px-3 py-2 text-right text-sm text-espresso transition-all duration-150 placeholder:text-flint focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/40 sm:w-28"
                />
                <motion.button
                  onClick={() => void handleAddExpense()}
                  disabled={!canAdd}
                  whileHover={canAdd ? { scale: 1.03 } : undefined}
                  whileTap={canAdd ? { scale: 0.96 } : undefined}
                  className="w-full rounded-full bg-amber px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber/25 transition-colors duration-150 hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  Add expense
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

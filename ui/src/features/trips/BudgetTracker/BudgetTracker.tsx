import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetTracker, type ExpenseCategory } from './useBudgetTracker';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BudgetTrackerProps {
  tripId: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; activeCls: string; pillCls: string }[] = [
  { value: 'food',       label: 'Food',       activeCls: 'bg-sunny text-navy border-sunny',              pillCls: 'bg-sunny/20 text-sunny-dark border-sunny/40' },
  { value: 'transport',  label: 'Transport',  activeCls: 'bg-ocean text-white border-ocean',             pillCls: 'bg-ocean/10 text-ocean border-ocean/25' },
  { value: 'stay',       label: 'Stay',       activeCls: 'bg-coral text-white border-coral',             pillCls: 'bg-coral/10 text-coral border-coral/25' },
  { value: 'activities', label: 'Activities', activeCls: 'bg-success text-white border-success',         pillCls: 'bg-success/10 text-success border-success/25' },
  { value: 'other',      label: 'Other',      activeCls: 'bg-navy text-white border-navy',               pillCls: 'bg-gray-100 text-gray border-gray-200' },
];

// ── Animation variants ────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring' as const, bounce: 0.3, duration: 0.4 } },
  exit:   { opacity: 0, x: 12, transition: { duration: 0.18 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function progressBarCls(pct: number): string {
  if (pct >= 100) return 'bg-coral';
  if (pct >= 75)  return 'bg-sunny';
  return 'bg-ocean';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BudgetTracker = ({ tripId }: BudgetTrackerProps) => {
  const {
    limit, expenses, totalSpent, remaining, isOverBudget,
    setLimit, addExpense, removeExpense,
  } = useBudgetTracker(tripId);

  // ── Local form state ───────────────────────────────────────────────────────
  const [draftLabel,    setDraftLabel]    = useState('');
  const [draftAmount,   setDraftAmount]   = useState('');
  const [draftCategory, setDraftCategory] = useState<ExpenseCategory>('other');
  const [draftLimit,    setDraftLimit]    = useState(limit !== null ? String(limit) : '');
  const [editingLimit,  setEditingLimit]  = useState(limit === null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const spentPct   = limit ? Math.min((totalSpent / limit) * 100, 100) : 0;
  const canAdd     = draftLabel.trim().length > 0 && Number(draftAmount) > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveLimit = useCallback(() => {
    const parsed = parseFloat(draftLimit);
    if (!isNaN(parsed) && parsed > 0) {
      setLimit(parsed);
      setEditingLimit(false);
    }
  }, [draftLimit, setLimit]);

  const handleLimitKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveLimit();
    if (e.key === 'Escape') setEditingLimit(false);
  }, [handleSaveLimit]);

  const handleAddExpense = useCallback(() => {
    const amount = parseFloat(draftAmount);
    addExpense(draftLabel, amount, draftCategory);
    setDraftLabel('');
    setDraftAmount('');
  }, [addExpense, draftLabel, draftAmount, draftCategory]);

  const handleExpenseKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddExpense();
  }, [handleAddExpense]);

  const categoryMeta = (cat: ExpenseCategory) =>
    CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[4];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 rounded-2xl border border-sunny/30 bg-sunny/5 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-sunny/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">

          {/* Title + budget status */}
          <div>
            <h4 className="text-base font-extrabold text-navy">Budget Tracker</h4>
            {limit !== null && !editingLimit && (
              <p className={[
                'text-xs font-semibold mt-0.5',
                isOverBudget ? 'text-coral' : 'text-gray',
              ].join(' ')}>
                {isOverBudget
                  ? `${formatCurrency(Math.abs(remaining!))} over budget`
                  : `${formatCurrency(remaining!)} remaining`}
              </p>
            )}
          </div>

          {/* Budget limit control */}
          {editingLimit ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray font-medium">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={draftLimit}
                onChange={(e) => setDraftLimit(e.target.value)}
                onKeyDown={handleLimitKeyDown}
                placeholder="Set budget"
                className="w-28 px-3 py-1.5 rounded-full border border-sunny/50 bg-white text-sm text-navy
                           focus:outline-none focus:ring-2 focus:ring-sunny/40 focus:border-sunny
                           transition-all duration-150"
                autoFocus
              />
              <motion.button
                onClick={handleSaveLimit}
                disabled={!draftLimit || isNaN(parseFloat(draftLimit))}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-full bg-sunny text-navy text-xs font-bold
                           shadow-sm shadow-sunny/30 hover:bg-sunny-dark transition-colors duration-150
                           disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Set
              </motion.button>
              {limit !== null && (
                <button
                  onClick={() => setEditingLimit(false)}
                  className="text-xs text-gray hover:text-navy transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setDraftLimit(String(limit ?? '')); setEditingLimit(true); }}
              className="text-xs font-semibold text-sunny-dark hover:text-navy transition-colors cursor-pointer"
            >
              {limit !== null ? `Budget: ${formatCurrency(limit)}` : 'Set budget'}
            </button>
          )}
        </div>

        {/* Progress bar */}
        {limit !== null && !editingLimit && (
          <div className="mt-3 h-1.5 rounded-full bg-sunny/20 overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors duration-500 ${progressBarCls(spentPct)}`}
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          </div>
        )}

        {/* Totals row */}
        {expenses.length > 0 && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray">
              Spent: <span className="font-bold text-navy">{formatCurrency(totalSpent)}</span>
            </span>
            {CATEGORIES.map(({ value, label, pillCls }) => {
              const catTotal = expenses
                .filter((e) => e.category === value)
                .reduce((s, e) => s + e.amount, 0);
              if (catTotal === 0) return null;
              return (
                <span
                  key={value}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pillCls}`}
                >
                  {label}: {formatCurrency(catTotal)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Expense list ── */}
      {expenses.length > 0 && (
        <ul className="divide-y divide-sunny/15 list-none p-0 m-0">
          <AnimatePresence initial={false}>
            {[...expenses].reverse().map((expense) => {
              const meta = categoryMeta(expense.category);
              return (
                <motion.li
                  key={expense.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  className="flex items-center gap-3 px-5 py-3"
                >
                  {/* Category pill */}
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${meta.pillCls}`}>
                    {meta.label}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-sm font-medium text-navy truncate">
                    {expense.label}
                  </span>

                  {/* Amount */}
                  <span className="flex-shrink-0 text-sm font-bold text-navy tabular-nums">
                    {formatCurrency(expense.amount)}
                  </span>

                  {/* Remove */}
                  <motion.button
                    onClick={() => removeExpense(expense.id)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Remove expense"
                    className="flex-shrink-0 text-gray hover:text-coral transition-colors duration-150 cursor-pointer"
                  >
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {/* ── Add expense form ── */}
      <div className="px-5 py-4 border-t border-sunny/20 space-y-3">

        {/* Category selector */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(({ value, label, activeCls, pillCls }) => (
            <motion.button
              key={value}
              onClick={() => setDraftCategory(value)}
              whileTap={{ scale: 0.93 }}
              className={[
                'text-xs font-bold px-2.5 py-1 rounded-full border transition-colors duration-150 cursor-pointer',
                draftCategory === value ? activeCls : pillCls,
              ].join(' ')}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Label + amount + add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={handleExpenseKeyDown}
            placeholder="What did you spend on?"
            className="flex-1 min-w-0 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy
                       placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-sunny/40 focus:border-sunny
                       transition-all duration-150"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            onKeyDown={handleExpenseKeyDown}
            placeholder="$0"
            className="w-20 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy text-right
                       placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-sunny/40 focus:border-sunny
                       transition-all duration-150"
          />
          <motion.button
            onClick={handleAddExpense}
            disabled={!canAdd}
            whileHover={canAdd ? { scale: 1.04 } : undefined}
            whileTap={canAdd ? { scale: 0.96 } : undefined}
            className="px-4 py-2 rounded-full bg-sunny text-navy text-sm font-bold shadow-sm shadow-sunny/30
                       hover:bg-sunny-dark transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Add
          </motion.button>
        </div>
      </div>
    </div>
  );
};

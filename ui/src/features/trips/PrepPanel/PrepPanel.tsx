import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrepItems } from './usePrepItems';
import type { PrepType } from '../../../shared/api/prep';

interface PrepPanelProps {
  token: string;
  tripId: number;
  destination: string;
  startDate: string;
}

function isoDateOffset(dateIso: string, daysBefore: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() - daysBefore);
  return date.toISOString().slice(0, 10);
}

function formatDueLabel(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T12:00:00`);
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(`${dueDate}T23:59:59`).getTime() < Date.now();
}

const PREP_META: Record<PrepType, { label: string; pillCls: string }> = {
  document: { label: 'Docs', pillCls: 'bg-amber/15 text-amber border-amber/30' },
  booking: { label: 'Booking', pillCls: 'bg-sky-100 text-sky-800 border-sky-200' },
  checklist: { label: 'Checklist', pillCls: 'bg-olive/10 text-olive border-olive/25' },
  health: { label: 'Health', pillCls: 'bg-rose-100 text-rose-800 border-rose-200' },
  other: { label: 'Other', pillCls: 'bg-parchment text-flint border-smoke' },
};

export const PrepPanel = ({ token, tripId, destination, startDate }: PrepPanelProps) => {
  const { items, loading, error, addItem, toggleItem, removeItem } = usePrepItems(token, tripId);
  const [draft, setDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const suggestions = useMemo(() => [
    {
      title: 'Check passport validity',
      prep_type: 'document' as const,
      due_date: isoDateOffset(startDate, 60),
      notes: `Make sure your passport is valid well beyond the trip to ${destination}.`,
    },
    {
      title: 'Review visa requirements',
      prep_type: 'document' as const,
      due_date: isoDateOffset(startDate, 45),
      notes: `Double-check entry requirements for ${destination}.`,
    },
    {
      title: 'Check in for departure bookings',
      prep_type: 'booking' as const,
      due_date: isoDateOffset(startDate, 1),
      notes: 'Complete online check-in and verify departure times.',
    },
    {
      title: 'Download confirmations and offline essentials',
      prep_type: 'checklist' as const,
      due_date: isoDateOffset(startDate, 2),
      notes: 'Save tickets, hotel details, maps, and backup copies before leaving.',
    },
  ], [destination, startDate]);

  const remainingCount = items.filter((item) => !item.completed).length;

  const handleQuickAdd = async (item: { title: string; prep_type: PrepType; due_date: string; notes: string }) => {
    setActionError(null);
    setFeedback(null);
    try {
      await addItem(item);
      setFeedback('Reminder saved.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add reminder.');
    }
  };

  const handleAddDraft = async () => {
    const title = draft.trim();
    if (!title) return;
    setActionError(null);
    setFeedback(null);
    try {
      await addItem({ title, prep_type: 'checklist' });
      setDraft('');
      setShowCustomInput(false);
      setFeedback('Reminder saved.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add checklist item.');
    }
  };

  const handleToggleItem = async (item: (typeof items)[number]) => {
    setActionError(null);
    setFeedback(null);
    try {
      await toggleItem(item);
      setFeedback(item.completed ? 'Marked as planned again.' : 'Marked done.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update prep item.');
    }
  };

  const handleRemoveItem = async (prepItemId: number) => {
    setActionError(null);
    setFeedback(null);
    try {
      await removeItem(prepItemId);
      setFeedback('Reminder removed.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete prep item.');
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-olive/20 bg-white overflow-hidden">
      <div className="px-5 py-5 border-b border-olive/10 bg-gradient-to-r from-olive/5 via-white to-amber/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-espresso">Ready</h4>
            <p className="text-xs text-flint mt-0.5">
              Keep the pre-trip loose ends visible without turning this into homework.
            </p>
            <p className="text-xs text-flint mt-1">These reminders are personal to you and do not show up for other trip members.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-olive/20 bg-olive/10 text-olive">
              {remainingCount} remaining
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCustomInput((prev) => !prev)}
              className="px-4 py-2 rounded-full bg-olive text-white text-sm font-bold"
            >
              {showCustomInput ? 'Close custom reminder' : 'Add custom reminder'}
            </motion.button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion.title}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleQuickAdd(suggestion)}
              className="px-3 py-2 rounded-full border border-smoke bg-white text-sm font-medium text-espresso hover:border-olive/30"
            >
              + {suggestion.title}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium"
              role="alert"
            >
              {actionError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 px-4 py-3 rounded-xl bg-olive/10 border border-olive/20 text-olive text-sm font-medium"
              role="status"
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showCustomInput && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddDraft();
                  }}
                  placeholder="Add a custom reminder"
                  className="flex-1 px-4 py-2.5 rounded-full border border-smoke bg-white text-sm text-espresso"
                />
                <motion.button
                  onClick={() => void handleAddDraft()}
                  disabled={!draft.trim()}
                  whileHover={draft.trim() ? { scale: 1.03 } : undefined}
                  whileTap={draft.trim() ? { scale: 0.97 } : undefined}
                  className="px-4 py-2.5 rounded-full bg-olive text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="divide-y divide-olive/10">
        {loading && (
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="rounded-2xl border border-olive/10 bg-olive/5 px-4 py-4 animate-pulse">
                <div className="h-4 w-20 rounded-full bg-parchment" />
                <div className="mt-3 h-3.5 w-1/2 rounded-full bg-smoke/70" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-parchment" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-5 py-8">
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm" role="alert">
              <p className="font-semibold text-danger">Prep reminders unavailable</p>
              <p className="mt-1 text-flint">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-espresso">No prep reminders yet</p>
            <p className="text-sm text-flint mt-1">Use the quick-add suggestions above to cover the essentials in one tap.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const meta = PREP_META[item.prep_type] ?? PREP_META.other;
            const dueLabel = formatDueLabel(item.due_date);
            const overdue = !item.completed && isOverdue(item.due_date);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="px-5 py-4 flex items-start gap-3"
              >
                <motion.button
                  onClick={() => void handleToggleItem(item)}
                  whileTap={{ scale: 0.88 }}
                  className={[
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors duration-150',
                    item.completed ? 'bg-olive border-olive' : 'bg-white border-smoke hover:border-olive',
                  ].join(' ')}
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.completed && (
                    <svg viewBox="0 0 10 10" className="w-full h-full text-white" fill="none">
                      <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </motion.button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.pillCls}`}>
                      {meta.label}
                    </span>
                    <span
                      className={[
                        'text-xs font-bold px-2 py-0.5 rounded-full border',
                        item.completed
                          ? 'bg-olive/10 text-olive border-olive/20'
                          : 'bg-parchment text-flint border-smoke',
                      ].join(' ')}
                    >
                      {item.completed ? 'Done' : 'Planned'}
                    </span>
                    <p className={['text-sm font-semibold', item.completed ? 'text-flint line-through' : 'text-espresso'].join(' ')}>
                      {item.title}
                    </p>
                    {dueLabel && (
                      <span className={['text-xs', item.completed ? 'text-flint/70' : overdue ? 'text-danger' : 'text-flint/80'].join(' ')}>
                        Due {dueLabel}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-flint">{item.notes}</p>
                  )}
                </div>

                <motion.button
                  onClick={() => void handleRemoveItem(item.id)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex-shrink-0 text-flint hover:text-danger transition-colors duration-150"
                  aria-label="Delete prep item"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

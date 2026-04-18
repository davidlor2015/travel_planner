import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReservations } from './useReservations';
import type { ReservationPayload, ReservationType } from '../../../shared/api/reservations';
import { createPrepItem, type PrepType } from '../../../shared/api/prep';

interface ReservationsPanelProps {
  token: string;
  tripId: number;
}

const RESERVATION_TYPES: Array<{ value: ReservationType; label: string; pillCls: string }> = [
  { value: 'flight', label: 'Flight', pillCls: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'hotel', label: 'Hotel', pillCls: 'bg-amber/15 text-amber border-amber/30' },
  { value: 'train', label: 'Train', pillCls: 'bg-olive/10 text-olive border-olive/25' },
  { value: 'bus', label: 'Bus', pillCls: 'bg-clay/10 text-clay border-clay/25' },
  { value: 'car', label: 'Car', pillCls: 'bg-espresso/10 text-espresso border-espresso/20' },
  { value: 'activity', label: 'Activity', pillCls: 'bg-violet-100 text-violet-800 border-violet-200' },
  { value: 'restaurant', label: 'Meal', pillCls: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'other', label: 'Other', pillCls: 'bg-parchment text-flint border-smoke' },
];

const RESERVATION_TEMPLATES: Array<{
  label: string;
  reservation_type: ReservationType;
  title: string;
  provider: string;
}> = [
  { label: 'Flight', reservation_type: 'flight', title: 'Outbound flight', provider: '' },
  { label: 'Hotel', reservation_type: 'hotel', title: 'Hotel stay', provider: '' },
  { label: 'Train', reservation_type: 'train', title: 'Train ride', provider: '' },
];

function formatReservationTime(startAt: string | null, endAt: string | null): string | null {
  if (!startAt && !endAt) return null;
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (start && end) return `${formatter.format(start)} - ${formatter.format(end)}`;
  if (start) return formatter.format(start);
  return `Ends ${formatter.format(end!)}`;
}

function formatMoney(amount: number | null, currency: string | null): string | null {
  if (amount === null) return null;
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function isUpcoming(startAt: string | null): boolean {
  if (!startAt) return false;
  return new Date(startAt).getTime() >= Date.now();
}

const initialForm = {
  title: '',
  reservation_type: 'hotel' as ReservationType,
  provider: '',
  confirmation_code: '',
  start_at: '',
  end_at: '',
  location: '',
  notes: '',
  amount: '',
  currency: 'USD',
  sync_to_budget: true,
};

interface BookingFollowUp {
  label: string;
  prepTitle: string;
  prepType: PrepType;
  notes: string;
}

function getBookingFollowUp(type: ReservationType, title: string): BookingFollowUp | null {
  if (type === 'flight' || type === 'train' || type === 'bus') {
    return {
      label: 'Add check-in reminder',
      prepTitle: `Check in for ${title}`,
      prepType: 'booking',
      notes: 'Complete check-in and confirm departure details before leaving.',
    };
  }
  if (type === 'hotel') {
    return {
      label: 'Add stay reminder',
      prepTitle: `Confirm details for ${title}`,
      prepType: 'booking',
      notes: 'Keep the address, arrival timing, and check-in details handy.',
    };
  }
  return null;
}

export const ReservationsPanel = ({ token, tripId }: ReservationsPanelProps) => {
  const { items, loading, error, addReservation, removeReservation } = useReservations(token, tripId);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<BookingFollowUp | null>(null);

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => item.start_at && new Date(item.start_at).getTime() >= now).length;
  }, [items]);

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;

    const payload: ReservationPayload = {
      title: form.title.trim(),
      reservation_type: form.reservation_type,
      provider: form.provider.trim() || undefined,
      confirmation_code: form.confirmation_code.trim() || undefined,
      start_at: form.start_at || undefined,
      end_at: form.end_at || undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      currency: form.amount ? form.currency.trim().toUpperCase() || 'USD' : undefined,
      sync_to_budget: form.amount ? form.sync_to_budget : false,
    };

    setSubmitting(true);
    setActionError(null);
    setFeedback(null);
    try {
      const created = await addReservation(payload);
      setForm(initialForm);
      setShowForm(false);
      setFeedback(payload.amount ? 'Booking saved and cost recorded.' : 'Booking saved.');
      setFollowUp(getBookingFollowUp(created?.reservation_type ?? payload.reservation_type, created?.title ?? payload.title));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-sky-200 bg-white overflow-hidden">
      <div className="px-5 py-5 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-espresso">Bookings</h4>
            <p className="text-xs text-flint mt-0.5">
              Keep confirmed travel details with the trip, without turning this into a giant form.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-800">
              {items.length} saved
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-amber/30 bg-amber/10 text-amber">
              {upcomingCount} upcoming
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm((prev) => !prev)}
              className="px-4 py-2 rounded-full bg-espresso text-white text-sm font-bold shadow-sm shadow-espresso/20"
            >
              {showForm ? 'Close booking form' : 'Add booking'}
            </motion.button>
          </div>
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

        <AnimatePresence>
          {followUp && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-amber/20 bg-amber/10 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-espresso">Next helpful step</p>
                <p className="text-sm text-flint mt-1">Turn this booking into a prep reminder so you do not have to enter it twice.</p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  setActionError(null);
                  try {
                    await createPrepItem(token, tripId, {
                      title: followUp.prepTitle,
                      prep_type: followUp.prepType,
                      notes: followUp.notes,
                    });
                    setFeedback('Prep reminder added from the booking.');
                    setFollowUp(null);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Failed to add prep reminder.');
                  }
                }}
                className="px-4 py-2 rounded-full bg-amber text-white text-sm font-bold shadow-sm shadow-amber/25"
              >
                {followUp.label}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap gap-2">
          {RESERVATION_TEMPLATES.map((template) => (
            <motion.button
              key={template.label}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  title: prev.title || template.title,
                  reservation_type: template.reservation_type,
                  provider: prev.provider || template.provider,
                }));
                setShowForm(true);
              }}
              className="px-3 py-2 rounded-full border border-smoke bg-white text-sm font-medium text-espresso hover:border-sky-200"
            >
              + {template.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Reservation title"
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                />
                <select
                  value={form.reservation_type}
                  onChange={(e) => handleChange('reservation_type', e.target.value as ReservationType)}
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                >
                  {RESERVATION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => handleChange('provider', e.target.value)}
                  placeholder="Provider or property"
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                />
                <input
                  type="text"
                  value={form.confirmation_code}
                  onChange={(e) => handleChange('confirmation_code', e.target.value)}
                  placeholder="Confirmation code"
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                />
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => handleChange('start_at', e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                />
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => handleChange('end_at', e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Address, station, terminal, or area"
                  className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso md:col-span-2"
                />
                <div className="grid grid-cols-[1fr_112px] gap-3 md:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="Booked cost"
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={3}
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso uppercase"
                  />
                </div>
                {form.amount.trim() && (
                  <label className="md:col-span-2 flex items-center gap-2 text-sm text-flint">
                    <input
                      type="checkbox"
                      checked={form.sync_to_budget}
                      onChange={(e) => handleChange('sync_to_budget', e.target.checked)}
                      className="w-4 h-4 rounded border-smoke text-espresso"
                    />
                    Add this booked cost to the budget automatically
                  </label>
                )}
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Notes, seat details, check-in info, or special reminders"
                  rows={3}
                  className="px-4 py-3 rounded-xl border border-smoke bg-white text-sm text-espresso md:col-span-2 resize-y"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting || !form.title.trim()}
                  whileHover={!submitting && form.title.trim() ? { scale: 1.03 } : undefined}
                  whileTap={!submitting && form.title.trim() ? { scale: 0.97 } : undefined}
                  className="px-4 py-2.5 rounded-full bg-espresso text-white text-sm font-bold shadow-sm shadow-espresso/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save booking'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="divide-y divide-sky-100">
        {loading && (
          <div className="px-5 py-4 text-sm text-flint">Loading reservations...</div>
        )}
        {!loading && error && (
          <div className="px-5 py-4 text-sm text-danger">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-espresso">No bookings saved yet</p>
            <p className="text-sm text-flint mt-1">Open the booking form when you want to save a flight, stay, train, or confirmation note.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const meta = RESERVATION_TYPES.find((option) => option.value === item.reservation_type) ?? RESERVATION_TYPES[RESERVATION_TYPES.length - 1];
            const timeLabel = formatReservationTime(item.start_at, item.end_at);
            const moneyLabel = formatMoney(item.amount, item.currency);
            const upcoming = isUpcoming(item.start_at);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.pillCls}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-olive/10 text-olive border-olive/20">
                      Booked
                    </span>
                    {upcoming && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-amber/10 text-amber border-amber/30">
                        Upcoming
                      </span>
                    )}
                    <p className="text-sm font-bold text-espresso">{item.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-flint">
                    {item.provider && <span>{item.provider}</span>}
                    {timeLabel && <span>{timeLabel}</span>}
                    {item.location && <span>{item.location}</span>}
                    {item.confirmation_code && <span>Confirmation: {item.confirmation_code}</span>}
                    {moneyLabel && <span>{moneyLabel}</span>}
                    {item.budget_expense_id && <span>Budget linked</span>}
                  </div>
                  {item.notes && <p className="text-sm text-flint/90">{item.notes}</p>}
                </div>
                <motion.button
                  onClick={async () => {
                    setActionError(null);
                    try {
                      await removeReservation(item.id);
                      setFeedback('Booking removed.');
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'Failed to remove booking.');
                    }
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex-shrink-0 text-flint hover:text-danger transition-colors duration-150"
                  aria-label="Delete reservation"
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

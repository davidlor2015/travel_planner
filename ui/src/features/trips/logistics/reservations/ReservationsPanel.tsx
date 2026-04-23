import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReservations } from "./useReservations";
import type {
  Reservation,
  ReservationPayload,
  ReservationType,
} from "../../../../shared/api/reservations";
import type { ReservationSummary } from "../../workspace/types";
import { BookingRow } from "./BookingRow";
import { track } from "../../../../shared/analytics";

interface ReservationsPanelProps {
  token: string;
  tripId: number;
  onSummaryChange?: (summary: ReservationSummary) => void;
  /**
   * When provided, each booking with a matchable date exposes an inline
   * "Add to itinerary" action. Absent means there's no writable draft to
   * pin into — BookingRow then omits the button entirely.
   */
  onAddToItinerary?: (reservation: Reservation) => void;
}

const RESERVATION_TYPES: Array<{
  value: ReservationType;
  label: string;
  pillCls: string;
}> = [
  {
    value: "flight",
    label: "Flight",
    pillCls: "bg-[#EDF0F5] text-[#3D5C7A] border-[#4D6B8A]/20",
  },
  {
    value: "hotel",
    label: "Stay",
    pillCls: "bg-amber/15 text-amber border-amber/30",
  },
  {
    value: "train",
    label: "Transfer (Train)",
    pillCls: "bg-olive/10 text-olive border-olive/25",
  },
  {
    value: "bus",
    label: "Transfer (Bus)",
    pillCls: "bg-clay/10 text-clay border-clay/25",
  },
  {
    value: "car",
    label: "Transfer (Car)",
    pillCls: "bg-espresso/10 text-espresso border-espresso/20",
  },
  {
    value: "activity",
    label: "Activity",
    pillCls: "bg-olive/10 text-olive border-olive/25",
  },
  {
    value: "restaurant",
    label: "Reservation",
    pillCls: "bg-[#F5EDE7] text-[#9A5230] border-[#B86845]/25",
  },
  {
    value: "other",
    label: "Insurance / Other",
    pillCls: "bg-parchment text-flint border-smoke",
  },
];

const RESERVATION_TEMPLATES: Array<{
  label: string;
  reservation_type: ReservationType;
  title: string;
  provider: string;
}> = [
  {
    label: "Flight",
    reservation_type: "flight",
    title: "Outbound flight",
    provider: "",
  },
  {
    label: "Stay",
    reservation_type: "hotel",
    title: "Hotel stay",
    provider: "",
  },
  {
    label: "Transfer",
    reservation_type: "train",
    title: "Airport transfer",
    provider: "",
  },
  {
    label: "Activity",
    reservation_type: "activity",
    title: "Booked activity",
    provider: "",
  },
  {
    label: "Insurance",
    reservation_type: "other",
    title: "Travel insurance policy",
    provider: "",
  },
  {
    label: "Reservation",
    reservation_type: "restaurant",
    title: "Dining reservation",
    provider: "",
  },
];

const STATUS_PILL_CLASSES = {
  upcoming: "border-[#4D6B8A]/25 bg-[#EDF0F5] text-[#3D5C7A]",
  today: "border-amber/30 bg-amber/10 text-amber",
  in_progress: "border-olive/25 bg-olive/10 text-olive",
  completed: "border-[#E5DDD1] bg-[#FAF8F5] text-[#6B5E52]",
  unscheduled: "border-[#E5DDD1] bg-white text-[#8A7E74]",
} as const;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function looksLikeInsuranceText(value: string | null | undefined): boolean {
  if (!value) return false;
  return /insurance|policy|coverage|cover/i.test(value);
}

function getBookingTypePresentation(item: {
  reservation_type: ReservationType;
  title: string;
  provider: string | null;
  notes: string | null;
}): { label: string; pillCls: string } {
  const genericType = RESERVATION_TYPES.find(
    (option) => option.value === item.reservation_type,
  );

  if (
    item.reservation_type === "other" &&
    (looksLikeInsuranceText(item.title) ||
      looksLikeInsuranceText(item.provider) ||
      looksLikeInsuranceText(item.notes))
  ) {
    return {
      label: "Insurance",
      pillCls: "bg-[#F5F0F8] text-[#7A5A8B] border-[#7A5A8B]/20",
    };
  }

  if (item.reservation_type === "restaurant") {
    return {
      label: "Reservation",
      pillCls: "bg-[#F5EDE7] text-[#9A5230] border-[#B86845]/25",
    };
  }

  if (item.reservation_type === "hotel") {
    return {
      label: "Stay",
      pillCls: "bg-amber/15 text-amber border-amber/30",
    };
  }

  if (
    item.reservation_type === "train" ||
    item.reservation_type === "bus" ||
    item.reservation_type === "car"
  ) {
    return {
      label: "Transfer",
      pillCls: "bg-olive/10 text-olive border-olive/25",
    };
  }

  return {
    label: genericType?.label ?? "Reservation",
    pillCls: genericType?.pillCls ?? "bg-parchment text-flint border-smoke",
  };
}

function getBookingStatus(
  startAt: string | null,
  endAt: string | null,
): {
  label: string;
  pillCls: string;
} {
  const now = new Date();
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;

  if (end && end.getTime() < now.getTime()) {
    return { label: "Completed", pillCls: STATUS_PILL_CLASSES.completed };
  }

  if (start && isSameCalendarDay(start, now)) {
    return { label: "Today", pillCls: STATUS_PILL_CLASSES.today };
  }

  if (start && start.getTime() > now.getTime()) {
    return { label: "Upcoming", pillCls: STATUS_PILL_CLASSES.upcoming };
  }

  if (
    start &&
    start.getTime() <= now.getTime() &&
    (!end || end.getTime() >= now.getTime())
  ) {
    return { label: "In progress", pillCls: STATUS_PILL_CLASSES.in_progress };
  }

  return { label: "Unscheduled", pillCls: STATUS_PILL_CLASSES.unscheduled };
}

function buildBookingDetailLabel(
  provider: string | null,
  location: string | null,
): string | null {
  const details = [provider, location].filter(Boolean);
  if (details.length === 0) return null;
  return details.join(" • ");
}

function formatReservationTime(
  startAt: string | null,
  endAt: string | null,
): string | null {
  if (!startAt && !endAt) return null;
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (start && end)
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  if (start) return formatter.format(start);
  return `Ends ${formatter.format(end!)}`;
}

function formatMoney(
  amount: number | null,
  currency: string | null,
): string | null {
  if (amount === null) return null;
  const code = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

const initialForm = {
  title: "",
  reservation_type: "hotel" as ReservationType,
  provider: "",
  confirmation_code: "",
  start_at: "",
  end_at: "",
  location: "",
  notes: "",
  amount: "",
  currency: "USD",
  sync_to_budget: true,
};

export const ReservationsPanel = ({
  token,
  tripId,
  onSummaryChange,
  onAddToItinerary,
}: ReservationsPanelProps) => {
  const {
    items,
    loading,
    error,
    addReservation,
    editReservation,
    removeReservation,
  } = useReservations(token, tripId);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<
    number | null
  >(null);

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return items.filter(
      (item) => item.start_at && new Date(item.start_at).getTime() >= now,
    ).length;
  }, [items]);

  useEffect(() => {
    onSummaryChange?.({ total: items.length, upcoming: upcomingCount, loading });
  }, [items.length, upcomingCount, loading, onSummaryChange]);

  const handleChange = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleForm = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (next) {
        track({
          name: "bookings_add_opened",
          props: { trip_id: tripId },
        });
      }
      return next;
    });
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
      currency: form.amount
        ? form.currency.trim().toUpperCase() || "USD"
        : undefined,
      sync_to_budget: form.amount ? form.sync_to_budget : false,
    };

    setSubmitting(true);
    setActionError(null);
    setFeedback(null);
    try {
      if (editingReservationId !== null) {
        await editReservation(editingReservationId, payload);
      } else {
        await addReservation(payload);
      }
      setForm(initialForm);
      setShowForm(false);
      setEditingReservationId(null);
      setFeedback(
        editingReservationId !== null
          ? "Booking updated."
          : payload.amount
            ? "Booking saved and cost recorded."
            : "Booking saved.",
      );
      track({
        name:
          editingReservationId !== null ? "booking_updated" : "booking_created",
        props: {
          trip_id: tripId,
          reservation_type: payload.reservation_type,
          has_amount: Boolean(payload.amount),
          has_reference: Boolean(payload.confirmation_code),
        },
      });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : editingReservationId !== null
            ? "Failed to update reservation."
            : "Failed to save reservation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-[#EAE2D6] bg-white">
      <div className="border-b border-[#EAE2D6] bg-[#FAF8F5] px-5 py-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h4 className="font-display text-base font-semibold text-espresso">
              Bookings
            </h4>
            <p className="mt-0.5 text-[12px] text-flint">
              {items.length === 0
                ? "Flights, stays, transfers, activities — all in one timeline."
                : (
                  <>
                    <span className="font-medium text-espresso">
                      {items.length}
                    </span>{" "}
                    saved
                    {upcomingCount > 0 ? (
                      <>
                        <span className="mx-1.5 text-[#C7BCAE]">·</span>
                        <span className="font-medium text-espresso">
                          {upcomingCount}
                        </span>{" "}
                        upcoming
                      </>
                    ) : null}
                  </>
                )}
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleToggleForm}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#E5DDD1] bg-white px-3 text-[12px] font-medium text-flint shadow-sm shadow-[#1C1108]/5 transition-colors hover:bg-[#FAF8F5] hover:text-[#1C1108]"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            {showForm ? "Close" : "Add booking"}
          </motion.button>
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

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A7E74]">
            Quick add
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
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
                  setEditingReservationId(null);
                  setShowForm(true);
                  track({
                    name: "bookings_quick_add_selected",
                    props: {
                      trip_id: tripId,
                      template: template.label,
                    },
                  });
                }}
                className="px-3 py-2 rounded-full border border-smoke bg-white text-sm font-medium text-espresso hover:border-amber/30"
              >
                + {template.label}
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl border border-[#EAE2D6] bg-white p-4">
                <p className="text-sm font-semibold text-[#1C1108]">
                  {editingReservationId !== null
                    ? "Edit booking"
                    : "Add booking details"}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Reservation title"
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <select
                    value={form.reservation_type}
                    onChange={(e) =>
                      handleChange(
                        "reservation_type",
                        e.target.value as ReservationType,
                      )
                    }
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  >
                    {RESERVATION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) => handleChange("provider", e.target.value)}
                    placeholder="Provider or property"
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <input
                    type="text"
                    value={form.confirmation_code}
                    onChange={(e) =>
                      handleChange("confirmation_code", e.target.value)
                    }
                    placeholder="Confirmation code"
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => handleChange("start_at", e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => handleChange("end_at", e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                  />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Address, station, terminal, or area"
                    className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso md:col-span-2"
                  />
                  <div className="grid grid-cols-[1fr_112px] gap-3 md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                      placeholder="Booked cost"
                      className="px-4 py-2.5 rounded-xl border border-smoke bg-white text-sm text-espresso"
                    />
                    <input
                      type="text"
                      value={form.currency}
                      onChange={(e) =>
                        handleChange("currency", e.target.value.toUpperCase())
                      }
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
                        onChange={(e) =>
                          handleChange("sync_to_budget", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-smoke text-espresso"
                      />
                      Add this booked cost to the budget automatically
                    </label>
                  )}
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Notes, seat details, check-in info, or special reminders"
                    rows={3}
                    className="px-4 py-3 rounded-xl border border-smoke bg-white text-sm text-espresso md:col-span-2 resize-y"
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <div className="flex gap-2">
                    {editingReservationId !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReservationId(null);
                          setForm(initialForm);
                          setShowForm(false);
                          setActionError(null);
                        }}
                        className="px-4 py-2.5 rounded-full border border-smoke bg-white text-sm font-semibold text-flint"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                    <motion.button
                      onClick={handleSubmit}
                      disabled={submitting || !form.title.trim()}
                      whileHover={
                        !submitting && form.title.trim()
                          ? { scale: 1.03 }
                          : undefined
                      }
                      whileTap={
                        !submitting && form.title.trim()
                          ? { scale: 0.97 }
                          : undefined
                      }
                      className="px-4 py-2.5 rounded-full bg-espresso text-white text-sm font-bold shadow-sm shadow-espresso/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting
                        ? "Saving..."
                        : editingReservationId !== null
                          ? "Save changes"
                          : "Save booking"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="divide-y divide-[#EAE2D6]">
        {loading && (
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="rounded-2xl border border-[#EAE2D6] bg-[#FAF8F5] px-4 py-4 animate-pulse"
              >
                <div className="h-4 w-24 rounded-full bg-parchment" />
                <div className="mt-3 h-3.5 w-1/2 rounded-full bg-smoke/70" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-parchment" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="px-5 py-8">
            <div
              className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm"
              role="alert"
            >
              <p className="font-semibold text-danger">Bookings unavailable</p>
              <p className="mt-1 text-flint">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-espresso">
              No bookings saved yet
            </p>
            <p className="mt-1 text-sm text-flint">
              Add the first booking so everyone can quickly see what is
              confirmed and what still needs to be arranged.
            </p>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex rounded-full bg-espresso px-4 py-2 text-sm font-bold text-white shadow-sm shadow-espresso/20"
            >
              Save first booking
            </motion.button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const typePresentation = getBookingTypePresentation(item);
            const statusPresentation = getBookingStatus(
              item.start_at,
              item.end_at,
            );
            const timeLabel = formatReservationTime(item.start_at, item.end_at);
            const moneyLabel = formatMoney(item.amount, item.currency);
            const detailLabel = buildBookingDetailLabel(
              item.provider,
              item.location,
            );

            return (
              <BookingRow
                key={item.id}
                title={item.title}
                typeLabel={typePresentation.label}
                typePillClassName={typePresentation.pillCls}
                statusLabel={statusPresentation.label}
                statusPillClassName={statusPresentation.pillCls}
                dateLabel={timeLabel}
                detailLabel={detailLabel}
                referenceLabel={item.confirmation_code}
                priceLabel={moneyLabel}
                hasBudgetLink={Boolean(item.budget_expense_id)}
                onAddToItinerary={
                  onAddToItinerary && item.start_at
                    ? () => {
                        track({
                          name: "booking_added_to_itinerary",
                          props: {
                            trip_id: tripId,
                            reservation_id: item.id,
                            reservation_type: item.reservation_type,
                          },
                        });
                        onAddToItinerary(item);
                        setFeedback("Added to itinerary.");
                      }
                    : undefined
                }
                onEdit={() => {
                  track({
                    name: "booking_edit_opened",
                    props: {
                      trip_id: tripId,
                      reservation_id: item.id,
                      reservation_type: item.reservation_type,
                    },
                  });
                  setEditingReservationId(item.id);
                  setForm({
                    title: item.title,
                    reservation_type: item.reservation_type,
                    provider: item.provider ?? "",
                    confirmation_code: item.confirmation_code ?? "",
                    start_at: item.start_at ? item.start_at.slice(0, 16) : "",
                    end_at: item.end_at ? item.end_at.slice(0, 16) : "",
                    location: item.location ?? "",
                    notes: item.notes ?? "",
                    amount: item.amount !== null ? String(item.amount) : "",
                    currency: item.currency ?? "USD",
                    sync_to_budget: Boolean(item.budget_expense_id),
                  });
                  setShowForm(true);
                  setActionError(null);
                }}
                onDelete={async () => {
                  setActionError(null);
                  try {
                    await removeReservation(item.id);
                    setFeedback("Booking removed.");
                    track({
                      name: "booking_deleted",
                      props: {
                        trip_id: tripId,
                        reservation_id: item.id,
                        reservation_type: item.reservation_type,
                      },
                    });
                  } catch (err) {
                    setActionError(
                      err instanceof Error
                        ? err.message
                        : "Failed to remove booking.",
                    );
                  }
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

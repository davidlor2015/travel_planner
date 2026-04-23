import { useCallback, useMemo } from "react";
import { ReservationsPanel } from "../../logistics/reservations";
import type { ReservationSummary } from "../types";
import type { EditableItinerary, EditableStopPatch } from "../../itinerary/itineraryDraft";
import type { Reservation } from "../../../../shared/api/reservations";

interface BookingsTabProps {
  token: string;
  tripId: number;
  onSummaryChange?: (summary: ReservationSummary) => void;
  /**
   * The draft the user is currently editing — if any. Only a pending draft is
   * writable; when the user is looking at a saved itinerary we intentionally
   * ask them to click "Edit itinerary" first so the explicit-save contract
   * stays clean.
   */
  pendingItinerary?: EditableItinerary | null;
  /**
   * Host action to insert a pre-filled stop into the pending draft. Present
   * only when there's a writable draft; when absent, BookingRow shows the
   * affordance as disabled with a short hint.
   */
  onAddStopFromBooking?: (
    dayNumber: number,
    initial: EditableStopPatch,
  ) => void;
}

/**
 * Convert a reservation's `start_at` ISO datetime into a local YYYY-MM-DD
 * string that can be matched against a day's `date`. Returns `null` when the
 * reservation has no start time — those aren't pinnable.
 */
function localDateFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTimeFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Turn a reservation into the initial patch used when we append it as a stop.
 * Kept conservative: only fields that both sides share cleanly (title, time,
 * location, notes). `cost_estimate` comes from the reservation amount when
 * available.
 */
function reservationToStopPatch(reservation: Reservation): EditableStopPatch {
  const notes =
    reservation.provider && reservation.provider.trim().length > 0
      ? `From booking · ${reservation.provider}`
      : null;
  const cost =
    reservation.amount != null && reservation.currency
      ? `${reservation.currency} ${reservation.amount}`
      : reservation.amount != null
        ? String(reservation.amount)
        : null;
  return {
    title: reservation.title,
    time: localTimeFromIso(reservation.start_at),
    location: reservation.location ?? null,
    notes,
    cost_estimate: cost,
    status: "planned",
  };
}

export function BookingsTab({
  token,
  tripId,
  onSummaryChange,
  pendingItinerary,
  onAddStopFromBooking,
}: BookingsTabProps) {
  /**
   * Build a date → day_number lookup once per itinerary. A reservation is
   * pinnable when (a) a pending draft exists, (b) the reservation has a
   * start_at, and (c) that date lines up with one of the draft's days. If a
   * date is missing on a day, we fall back to nothing for that day — we'd
   * rather show the button as disabled than silently land on a wrong day.
   */
  const dayIndexByDate = useMemo(() => {
    const map = new Map<string, number>();
    pendingItinerary?.days.forEach((day) => {
      if (day.date) map.set(day.date, day.day_number);
    });
    return map;
  }, [pendingItinerary]);

  const addFromBooking = useCallback(
    (reservation: Reservation) => {
      if (!onAddStopFromBooking) return;
      const localDate = localDateFromIso(reservation.start_at);
      const matchedDayNumber = localDate
        ? (dayIndexByDate.get(localDate) ?? null)
        : null;
      const firstDayNumber = pendingItinerary?.days[0]?.day_number ?? null;
      const targetDay = matchedDayNumber ?? firstDayNumber;
      if (targetDay == null) return;
      onAddStopFromBooking(targetDay, reservationToStopPatch(reservation));
    },
    [dayIndexByDate, onAddStopFromBooking, pendingItinerary],
  );

  const canPinBookings = Boolean(
    onAddStopFromBooking && pendingItinerary && pendingItinerary.days.length > 0,
  );

  return (
    <div className="space-y-3">
      <ReservationsPanel
        token={token}
        tripId={tripId}
        onSummaryChange={onSummaryChange}
        onAddToItinerary={canPinBookings ? addFromBooking : undefined}
      />
    </div>
  );
}

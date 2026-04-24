import type { Reservation, ReservationType } from "./api";

export type ReservationViewModel = {
  id: number;
  title: string;
  typeLabel: string;
  statusLabel: string;
  detailLabel: string | null;
  dateLabel: string | null;
  priceLabel: string | null;
  type: ReservationType;
};

const TYPE_LABELS: Record<ReservationType, string> = {
  flight: "Flight",
  hotel: "Stay",
  train: "Transfer",
  bus: "Transfer",
  car: "Transfer",
  activity: "Activity",
  restaurant: "Reservation",
  other: "Other",
};

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(reservation: Reservation): string {
  const now = Date.now();
  const start = reservation.start_at ? new Date(reservation.start_at).getTime() : null;
  const end = reservation.end_at ? new Date(reservation.end_at).getTime() : null;
  if (end !== null && end < now) return "Completed";
  if (start !== null && start <= now && (end === null || end >= now)) return "In Progress";
  if (start !== null && start > now) return "Upcoming";
  return "Unscheduled";
}

export function toReservationViewModel(reservation: Reservation): ReservationViewModel {
  const details = [reservation.provider, reservation.location].filter(Boolean).join(" • ");
  return {
    id: reservation.id,
    title: reservation.title,
    typeLabel: TYPE_LABELS[reservation.reservation_type],
    statusLabel: statusLabel(reservation),
    detailLabel: details || null,
    dateLabel: formatDateTime(reservation.start_at),
    priceLabel:
      reservation.amount != null
        ? `$${reservation.amount.toFixed(2)}${reservation.currency ? ` ${reservation.currency}` : ""}`
        : null,
    type: reservation.reservation_type,
  };
}

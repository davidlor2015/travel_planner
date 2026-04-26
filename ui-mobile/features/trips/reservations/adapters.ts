import type { Reservation, ReservationType } from "./api";

// ─── Filter types ────────────────────────────────────────────────────────────

export type BookingFilterKey = "all" | "flights" | "lodging" | "transit" | "activities";

export type BookingFilterChip = { key: BookingFilterKey; label: string };

export const BOOKING_FILTER_CHIPS: BookingFilterChip[] = [
  { key: "all", label: "All" },
  { key: "flights", label: "Flights" },
  { key: "lodging", label: "Lodging" },
  { key: "transit", label: "Transit" },
  { key: "activities", label: "Activities" },
];

const FILTER_TYPE_MAP: Record<BookingFilterKey, ReservationType[]> = {
  all: [],
  flights: ["flight"],
  lodging: ["hotel"],
  transit: ["train", "bus", "car"],
  activities: ["activity", "restaurant", "other"],
};

export function filterReservations(
  items: Reservation[],
  filter: BookingFilterKey,
): Reservation[] {
  if (filter === "all") return items;
  const allowed = FILTER_TYPE_MAP[filter];
  return items.filter((r) => allowed.includes(r.reservation_type));
}

// ─── View model ──────────────────────────────────────────────────────────────

export type StatusPillVariant = "confirmed" | "pending" | "muted";

export type ReservationViewModel = {
  id: number;
  title: string;
  confirmationCode: string | null;
  detailLine: string | null;
  priceLabel: string | null;
  statusLabel: string;
  statusVariant: StatusPillVariant;
  type: ReservationType;
  typeIconName: BookingIconName;
  location: string | null;
};

// ─── Confirmation summary ────────────────────────────────────────────────────

export type BookingConfirmationSummary = {
  confirmed: number;
  pending: number;
  unscheduled: number;
  total: number;
  confirmedLabel: string;
};

export function getStatusVariant(reservation: Reservation): StatusPillVariant {
  const now = Date.now();
  const start = reservation.start_at ? new Date(reservation.start_at).getTime() : null;
  const end = reservation.end_at ? new Date(reservation.end_at).getTime() : null;

  if (start === null) return "muted";
  if (end !== null && end < now) return "confirmed"; // completed
  if (start <= now) return "confirmed"; // active / in progress
  // future booking
  if (reservation.confirmation_code) return "confirmed";
  return "pending";
}

export function getStatusLabel(reservation: Reservation): string {
  const variant = getStatusVariant(reservation);
  const now = Date.now();
  const end = reservation.end_at ? new Date(reservation.end_at).getTime() : null;
  const start = reservation.start_at ? new Date(reservation.start_at).getTime() : null;

  if (variant === "muted") return "No date";
  if (end !== null && end < now) return "Done";
  if (start !== null && start <= now) return "Active";
  if (variant === "confirmed") return "Confirmed";
  // pending — show days until expiry of hold if we had that info; for now just "Pending"
  return "Pending";
}

export function buildConfirmationSummary(items: Reservation[]): BookingConfirmationSummary {
  let confirmed = 0;
  let pending = 0;
  let unscheduled = 0;

  for (const r of items) {
    const v = getStatusVariant(r);
    if (v === "confirmed") confirmed++;
    else if (v === "pending") pending++;
    else unscheduled++;
  }

  const total = items.length;
  const confirmedLabel =
    total === 0
      ? "No reservations yet"
      : confirmed === total
        ? `All ${total} confirmed`
        : `${confirmed} of ${total} confirmed`;

  return { confirmed, pending, unscheduled, total, confirmedLabel };
}

// ─── Type icon map ───────────────────────────────────────────────────────────

export type BookingIconName =
  | "airplane-outline"
  | "bed-outline"
  | "train-outline"
  | "bus-outline"
  | "car-outline"
  | "star-outline"
  | "restaurant-outline"
  | "bookmark-outline";

export const TYPE_ICON_NAME: Record<ReservationType, BookingIconName> = {
  flight: "airplane-outline",
  hotel: "bed-outline",
  train: "train-outline",
  bus: "bus-outline",
  car: "car-outline",
  activity: "star-outline",
  restaurant: "restaurant-outline",
  other: "bookmark-outline",
};

// ─── Detail line builders ─────────────────────────────────────────────────────

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatShortDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function buildDetailLine(r: Reservation): string | null {
  const type = r.reservation_type;

  if (type === "flight") {
    const parts: string[] = [];
    if (r.provider) parts.push(r.provider);
    const dt = formatShortDateTime(r.start_at);
    if (dt) parts.push(dt);
    return parts.join(" · ") || null;
  }

  if (type === "hotel") {
    const startDate = formatShortDate(r.start_at);
    const endDate = formatShortDate(r.end_at);
    const nights = nightsBetween(r.start_at, r.end_at);
    if (startDate && endDate && nights !== null) {
      return `${startDate} — ${endDate} · ${nights} ${nights === 1 ? "night" : "nights"}`;
    }
    if (startDate) return `Check-in ${startDate}`;
    return null;
  }

  if (type === "train" || type === "bus" || type === "car") {
    const dt = formatShortDate(r.start_at);
    if (r.provider && dt) return `${r.provider} · ${dt}`;
    if (r.provider) return r.provider;
    if (dt) return `Activate ${dt}`;
    return null;
  }

  // activity, restaurant, other
  const dt = formatShortDateTime(r.start_at);
  if (dt) return dt;
  if (r.location) return r.location;
  return null;
}

// ─── View model builder ───────────────────────────────────────────────────────

export function toReservationViewModel(reservation: Reservation): ReservationViewModel {
  const priceLabel =
    reservation.amount != null
      ? `$${reservation.amount % 1 === 0 ? reservation.amount.toFixed(0) : reservation.amount.toFixed(2)}${reservation.currency && reservation.currency !== "USD" ? ` ${reservation.currency}` : ""}`
      : null;

  return {
    id: reservation.id,
    title: reservation.title,
    confirmationCode:
      reservation.reservation_type === "flight" && reservation.confirmation_code
        ? reservation.confirmation_code
        : null,
    detailLine: buildDetailLine(reservation),
    priceLabel,
    statusLabel: getStatusLabel(reservation),
    statusVariant: getStatusVariant(reservation),
    type: reservation.reservation_type,
    typeIconName: TYPE_ICON_NAME[reservation.reservation_type],
    location: reservation.location,
  };
}

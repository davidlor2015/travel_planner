import { Linking } from "react-native";

import type { Reservation } from "./api";
import type { BookingIconName, StatusPillVariant } from "./adapters";
import { getStatusLabel, getStatusVariant, TYPE_ICON_NAME } from "./adapters";

// ─── Grouping ─────────────────────────────────────────────────────────────────

export type BookingGroups = {
  nextUpcoming: Reservation | null;
  upcoming: Reservation[];
  past: Reservation[];
};

export function groupReservationsByTime(items: Reservation[]): BookingGroups {
  const now = Date.now();
  const upcoming: Reservation[] = [];
  const past: Reservation[] = [];

  for (const r of items) {
    const end = r.end_at ? new Date(r.end_at).getTime() : null;
    const start = r.start_at ? new Date(r.start_at).getTime() : null;

    if (start === null) {
      upcoming.push(r);
    } else if (end !== null && end < now) {
      past.push(r);
    } else if (end === null && start < now - 24 * 60 * 60 * 1000) {
      // Single-event started > 24 h ago with no end → treat as past
      past.push(r);
    } else {
      upcoming.push(r);
    }
  }

  // Items arrive sorted by start_at (nulls last) from useReservations
  const nextUpcoming =
    upcoming.find((r) => r.start_at !== null) ?? upcoming[0] ?? null;

  return { nextUpcoming, upcoming, past };
}

// ─── Navigate ─────────────────────────────────────────────────────────────────

export function buildNavigateUrl(location: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(location)}`;
}

export async function openNavigate(location: string): Promise<void> {
  await Linking.openURL(buildNavigateUrl(location));
}

// ─── Detail view model ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  flight: "Flight",
  hotel: "Stay",
  train: "Train",
  bus: "Bus",
  car: "Car",
  activity: "Activity",
  restaurant: "Dining",
  other: "Other",
};

function formatFullDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function labelForIso(iso: string | null): string | null {
  if (!iso) return null;
  // If the ISO string has a time component (non-midnight), use datetime format
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hasTime = iso.includes("T") && (d.getHours() !== 0 || d.getMinutes() !== 0);
  return hasTime ? formatFullDateTime(iso) : formatFullDate(iso);
}

export type BookingDetailViewModel = {
  id: number;
  title: string;
  typeLabel: string;
  typeIconName: BookingIconName;
  provider: string | null;
  confirmationCode: string | null;
  startLabel: string | null;
  endLabel: string | null;
  location: string | null;
  navigateUrl: string | null;
  notes: string | null;
  priceLabel: string | null;
  statusLabel: string;
  statusVariant: StatusPillVariant;
};

export function buildDetailViewModel(r: Reservation): BookingDetailViewModel {
  const priceLabel =
    r.amount != null
      ? `$${r.amount % 1 === 0 ? r.amount.toFixed(0) : r.amount.toFixed(2)}${r.currency && r.currency !== "USD" ? ` ${r.currency}` : ""}`
      : null;

  return {
    id: r.id,
    title: r.title,
    typeLabel: TYPE_LABELS[r.reservation_type] ?? "Other",
    typeIconName: TYPE_ICON_NAME[r.reservation_type],
    provider: r.provider,
    confirmationCode: r.confirmation_code,
    startLabel: labelForIso(r.start_at),
    endLabel: labelForIso(r.end_at),
    location: r.location,
    navigateUrl: r.location ? buildNavigateUrl(r.location) : null,
    notes: r.notes,
    priceLabel,
    statusLabel: getStatusLabel(r),
    statusVariant: getStatusVariant(r),
  };
}

import {
  BOOKING_FILTER_CHIPS,
  filterReservations,
} from "@/features/trips/reservations/adapters";
import type { Reservation } from "@/features/trips/reservations/api";

function reservation(id: number, reservationType: Reservation["reservation_type"]): Reservation {
  return {
    id,
    trip_id: 9,
    title: `Reservation ${id}`,
    reservation_type: reservationType,
    provider: null,
    confirmation_code: null,
    start_at: null,
    end_at: null,
    location: null,
    notes: null,
    amount: null,
    currency: null,
    budget_expense_id: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("reservation filter mapping", () => {
  const items: Reservation[] = [
    reservation(1, "flight"),
    reservation(2, "hotel"),
    reservation(3, "restaurant"),
    reservation(4, "activity"),
    reservation(5, "other"),
    reservation(6, "train"),
    reservation(7, "bus"),
    reservation(8, "car"),
  ];

  it("exposes the bookings tab filters in the expected order", () => {
    expect(BOOKING_FILTER_CHIPS.map((chip) => chip.label)).toEqual([
      "All",
      "Flights",
      "Lodging",
      "Restaurants",
      "Activities",
      "Transport",
      "Other",
    ]);
  });

  it("maps dining to restaurant and activities to activity only", () => {
    expect(filterReservations(items, "dining").map((item) => item.reservation_type)).toEqual([
      "restaurant",
    ]);
    expect(filterReservations(items, "activities").map((item) => item.reservation_type)).toEqual([
      "activity",
    ]);
  });

  it("maps transport to train, bus, and car", () => {
    expect(filterReservations(items, "transport").map((item) => item.reservation_type)).toEqual([
      "train",
      "bus",
      "car",
    ]);
  });

  it("maps other to other only", () => {
    expect(filterReservations(items, "other").map((item) => item.reservation_type)).toEqual([
      "other",
    ]);
  });
});

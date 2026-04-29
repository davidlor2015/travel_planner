// Path: ui/src/features/trips/logistics/activity/types.ts
// Summary: Implements types module logic.

export type TripActivityType =
  | 'trip_created'
  | 'member_joined'
  | 'booking_confirmed'
  | 'itinerary_updated'
  | 'note_added'
  | 'packing_completed'
  | 'reminder_triggered';

export interface TripActivityItem {
  id: string;
  tripId: number;
  tripLabel: string;
  type: TripActivityType;
  title: string;
  detail: string;
  occurredAt: string | null;
  unreadHint: string;
}

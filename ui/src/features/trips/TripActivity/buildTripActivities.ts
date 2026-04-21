import type { Itinerary } from '../../../shared/api/ai';
import type { Trip } from '../../../shared/api/trips';
import type { EditableItinerary } from '../itineraryDraft';
import type { BudgetSummary, PackingSummary, ReservationSummary } from '../workspace/types';
import type { TripActivityItem } from './types';

interface BuildTripActivitiesInput {
  trip: Trip;
  savedItinerary: Itinerary | null;
  pendingItinerary: EditableItinerary | null;
  packingSummary?: PackingSummary;
  budgetSummary?: BudgetSummary;
  reservationSummary?: ReservationSummary;
  now?: Date;
}

function isoWithOffset(baseIso: string, offsetMinutes: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString();
  }

  const value = new Date(base.getTime() + offsetMinutes * 60_000);
  return value.toISOString();
}

function daysUntil(startIso: string, now: Date): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;

  const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const midnightStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  return Math.round((midnightStart - midnightNow) / 86_400_000);
}

export function buildTripActivities({
  trip,
  savedItinerary,
  pendingItinerary,
  packingSummary,
  budgetSummary,
  reservationSummary,
  now = new Date(),
}: BuildTripActivitiesInput): TripActivityItem[] {
  const items: TripActivityItem[] = [];

  items.push({
    id: 'trip-created',
    tripId: trip.id,
    tripLabel: trip.title,
    type: 'trip_created',
    title: 'Trip created',
    detail: `${trip.destination} is set with your dates and base details.`,
    occurredAt: trip.created_at,
    unreadHint: 'New trip setup',
  });

  for (const member of trip.members) {
    if (member.role.toLowerCase() === 'owner') continue;
    items.push({
      id: `member-joined-${member.user_id}`,
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'member_joined',
      title: 'Member joined',
      detail: `${member.email} joined this trip workspace.`,
      occurredAt: member.joined_at,
      unreadHint: 'Companion update',
    });
  }

  if ((reservationSummary?.upcoming ?? 0) > 0) {
    items.push({
      id: `booking-upcoming-${reservationSummary?.upcoming ?? 0}`,
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      detail: `${reservationSummary?.upcoming ?? 0} booking${(reservationSummary?.upcoming ?? 0) === 1 ? '' : 's'} are coming up.`,
      occurredAt: isoWithOffset(trip.created_at, 22),
      unreadHint: 'Travel logistics',
    });
  }

  if (savedItinerary) {
    items.push({
      id: `itinerary-saved-${savedItinerary.days.length}`,
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'itinerary_updated',
      title: 'Itinerary updated',
      detail: `Shared itinerary now has ${savedItinerary.days.length} planned day${savedItinerary.days.length === 1 ? '' : 's'}.`,
      occurredAt: isoWithOffset(trip.created_at, 18),
      unreadHint: 'Plan changes',
    });
  } else if (pendingItinerary) {
    items.push({
      id: `itinerary-draft-${pendingItinerary.days.length}`,
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'itinerary_updated',
      title: 'Itinerary draft ready',
      detail: `${pendingItinerary.days.length} draft day${pendingItinerary.days.length === 1 ? '' : 's'} are waiting for review.`,
      occurredAt: isoWithOffset(trip.created_at, 14),
      unreadHint: 'Plan changes',
    });
  }

  if (trip.notes && trip.notes.trim().length > 0) {
    items.push({
      id: 'trip-note-added',
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'note_added',
      title: 'Trip note added',
      detail: 'Trip notes are available for shared context and planning cues.',
      occurredAt: isoWithOffset(trip.created_at, 12),
      unreadHint: 'Trip context',
    });
  }

  if ((packingSummary?.total ?? 0) > 0 && (packingSummary?.progressPct ?? 0) >= 100) {
    items.push({
      id: 'packing-completed',
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'packing_completed',
      title: 'Packing completed',
      detail: 'Packing list is fully checked off for this trip.',
      occurredAt: isoWithOffset(trip.created_at, 30),
      unreadHint: 'Personal prep',
    });
  }

  const departureDelta = daysUntil(trip.start_date, now);
  if (departureDelta <= 7) {
    const countdownLabel = departureDelta > 1
      ? `${departureDelta} days to departure`
      : departureDelta === 1
        ? 'Departure tomorrow'
        : departureDelta === 0
          ? 'Departure today'
          : 'Trip already started';

    items.push({
      id: `departure-reminder-${Math.max(-1, departureDelta)}`,
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'reminder_triggered',
      title: 'Departure reminder',
      detail: `${countdownLabel}. Final check for itinerary, bookings, and essentials.`,
      occurredAt: new Date(now.getTime() - 15 * 60_000).toISOString(),
      unreadHint: 'Departure timing',
    });
  }

  if (budgetSummary?.isOverBudget) {
    items.push({
      id: 'budget-over',
      tripId: trip.id,
      tripLabel: trip.title,
      type: 'reminder_triggered',
      title: 'Budget reminder',
      detail: 'Spend is above the current guardrail. A quick budget pass can keep plans balanced.',
      occurredAt: isoWithOffset(trip.created_at, 26),
      unreadHint: 'Budget checkpoint',
    });
  }

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

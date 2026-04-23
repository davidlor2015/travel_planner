import type { DayAnchorType, EditableItinerary } from "./itineraryDraft";

export type ItineraryReadinessSeverity = "blocker" | "watch" | "unknown";

export interface ItineraryReadinessIndicator {
  severity: ItineraryReadinessSeverity;
  label: string;
}

export interface ItineraryReadinessSnapshot {
  dayIndicators: Record<number, ItineraryReadinessIndicator>;
  stopIndicators: Record<string, ItineraryReadinessIndicator>;
}

const OPERATIONAL_ANCHOR_TYPES: ReadonlySet<DayAnchorType> = new Set([
  "flight",
  "hotel_checkin",
]);

function isOperationalAnchorType(type: DayAnchorType): boolean {
  return OPERATIONAL_ANCHOR_TYPES.has(type);
}

function hasTimedNode(day: EditableItinerary["days"][number]): boolean {
  const timedStop = day.items.some((item) => Boolean(item.time?.trim()));
  const timedAnchor = day.day_anchors.some(
    (anchor) =>
      isOperationalAnchorType(anchor.type) && Boolean(anchor.time?.trim()),
  );
  return timedStop || timedAnchor;
}

export function buildItineraryReadinessSnapshot(
  itinerary: EditableItinerary,
  options?: { groupTrip?: boolean },
): ItineraryReadinessSnapshot {
  const groupTrip = options?.groupTrip ?? false;
  const dayIndicators: Record<number, ItineraryReadinessIndicator> = {};
  const stopIndicators: Record<string, ItineraryReadinessIndicator> = {};

  const firstDay = itinerary.days[0];
  if (firstDay && (firstDay.items.length > 0 || firstDay.day_anchors.length > 0)) {
    if (!hasTimedNode(firstDay)) {
      dayIndicators[firstDay.day_number] = {
        severity: "watch",
        label: "Missing first-day timing",
      };
    }
  } else if (firstDay) {
    dayIndicators[firstDay.day_number] = {
      severity: "unknown",
      label: "First day still open",
    };
  }

  if (groupTrip) {
    const ownershipSignalsUsed = itinerary.days.some((day) =>
      day.items.some((item) =>
        Boolean(item.handled_by?.trim() || item.booked_by?.trim()),
      ) ||
      day.day_anchors.some(
        (anchor) =>
          isOperationalAnchorType(anchor.type) &&
          Boolean(anchor.handled_by?.trim() || anchor.booked_by?.trim()),
      ),
    );

    if (ownershipSignalsUsed) {
      for (const day of itinerary.days) {
        for (const item of day.items) {
          const hasHandledBy = Boolean(item.handled_by?.trim());
          if (!hasHandledBy) {
            stopIndicators[item.client_id] = {
              severity: "watch",
              label: "Needs handler",
            };
          }
        }
        const hasUnownedOperationalAnchor = day.day_anchors.some(
          (anchor) =>
            isOperationalAnchorType(anchor.type) &&
            !anchor.handled_by?.trim(),
        );
        if (hasUnownedOperationalAnchor && !dayIndicators[day.day_number]) {
          dayIndicators[day.day_number] = {
            severity: "watch",
            label: "Anchor needs handler",
          };
        }
      }
    }
  }

  return {
    dayIndicators,
    stopIndicators,
  };
}

import type { Itinerary } from "../../../shared/api/ai";
import type { Trip } from "../../../shared/api/trips";
import type {
  DraftAiAssistRequest,
  EditableItinerary,
  RefinementTimeBlock,
  RefinementVariant,
} from "./itineraryDraft";
import { getTripDurationDays } from "../workspace/helpers/tripDateUtils";

export interface RegenerationControlState {
  dayNumber: number;
  timeBlock: RefinementTimeBlock;
  variant: RefinementVariant;
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildManualItineraryDraft(trip: Trip): Itinerary {
  const durationDays = getTripDurationDays(trip.start_date, trip.end_date);
  const start = new Date(trip.start_date);

  const days = Array.from({ length: durationDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      day_number: index + 1,
      date: Number.isNaN(date.getTime()) ? null : toIsoDate(date),
      items: [],
    };
  });

  return {
    title: `${trip.title} itinerary`,
    summary: trip.notes?.trim() ?? "",
    days,
    budget_breakdown: null,
    packing_list: null,
    tips: null,
    source: "manual",
    source_label: "Manual draft",
    fallback_used: false,
  };
}

export function getDefaultRegenerationControls(
  itinerary: EditableItinerary,
): RegenerationControlState {
  return {
    dayNumber: itinerary.days[0]?.day_number ?? 1,
    timeBlock: "full_day",
    variant: "more_local",
  };
}

export function getAiAssistPayload(
  itinerary: EditableItinerary,
  request: DraftAiAssistRequest,
  controls: RegenerationControlState | undefined,
  lockedIds: string[],
  favoriteIds: string[],
): {
  variant: RefinementVariant;
  timeBlock: RegenerationControlState["timeBlock"];
  lockedIds: string[];
  favoriteIds: string[];
} {
  const requestedDayItemIds =
    itinerary.days
      .find((day) => day.day_number === request.dayNumber)
      ?.items.map((item) => item.client_id) ?? [];

  if (request.action === "regenerate_day") {
    return {
      variant: controls?.variant ?? "more_local",
      timeBlock: "full_day",
      lockedIds,
      favoriteIds,
    };
  }

  if (request.action === "stop_alternatives" && request.stopId) {
    if (requestedDayItemIds.includes(request.stopId)) {
      return {
        variant: "more_local",
        timeBlock: "full_day",
        lockedIds: Array.from(
          new Set([
            ...lockedIds,
            ...requestedDayItemIds.filter((itemId) => itemId !== request.stopId),
          ]),
        ),
        favoriteIds: favoriteIds.filter((itemId) => itemId !== request.stopId),
      };
    }
  }

  if (request.action === "fill_gaps") {
    return {
      variant: "more_local",
      timeBlock: "full_day",
      lockedIds: Array.from(new Set([...lockedIds, ...requestedDayItemIds])),
      favoriteIds,
    };
  }

  if (request.action === "rebalance_pacing") {
    return {
      variant: "less_walking",
      timeBlock: "full_day",
      lockedIds,
      favoriteIds,
    };
  }

  if (request.action === "route_optimization") {
    return {
      variant: "less_walking",
      timeBlock: "full_day",
      lockedIds,
      favoriteIds,
    };
  }

  return {
    variant: controls?.variant ?? "more_local",
    timeBlock: controls?.timeBlock ?? "full_day",
    lockedIds,
    favoriteIds,
  };
}

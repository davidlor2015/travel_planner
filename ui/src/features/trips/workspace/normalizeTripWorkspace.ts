import type { Itinerary } from "../../../shared/api/ai";

const JSON_MARKER = "DETAILS (JSON): ";

export function parseTripItineraryPayload(description?: string | null): Itinerary | null {
  const raw = description?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const idx = raw.indexOf(JSON_MARKER);
    if (idx !== -1) {
      try {
        return JSON.parse(raw.slice(idx + JSON_MARKER.length));
      } catch {
        return null;
      }
    }

    return null;
  }
}

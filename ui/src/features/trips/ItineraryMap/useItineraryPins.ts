import { useMemo } from 'react';
import type { Itinerary } from '../../../shared/api/ai';
import { useGeocode } from '../../../shared/hooks/useGeocode';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItineraryPin {
  eventKey: string;             // unique React key: `${dayNumber}-${eventIndex}`
  label: string;                // activity title
  time: string | null;
  location: string | null;
  coords: [number, number];
  dayNumber: number;
  eventIndex: number;           // 1-based position within the day
  dayColor: string;             // hex colour for this day's markers and polyline
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Cycles through brand colours per day (amber, clay, olive, danger, espresso).
const DAY_COLORS = ['#B45309', '#8B5A3E', '#3F6212', '#881337', '#1C1917'];

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Derives a flat list of map-ready pins from an Itinerary.
 *
 * Priority:
 *   1. item.lat / item.lon present (Smart Plan geocodes at generation time)
 *   2. item.location string → geocoded via the shared Nominatim cache
 *
 * Events with neither field are silently skipped.
 */
export function useItineraryPins(
  itinerary: Itinerary,
): { pins: ItineraryPin[]; loading: boolean } {
  // Collect only the location strings that need geocoding (no direct coords).
  const locationsToGeocode = useMemo(() => {
    const locs: string[] = [];
    for (const day of itinerary.days) {
      for (const item of day.items) {
        if ((item.lat === null || item.lon === null) && item.location) {
          locs.push(item.location);
        }
      }
    }
    return locs;
  }, [itinerary]);

  const { pins: geocodedPins, loading } = useGeocode(locationsToGeocode);

  // Build a location → coords lookup from geocoding results.
  const geocodedMap = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const p of geocodedPins) {
      m.set(p.destination, p.coords);
    }
    return m;
  }, [geocodedPins]);

  const pins = useMemo<ItineraryPin[]>(() => {
    const result: ItineraryPin[] = [];
    for (const day of itinerary.days) {
      const dayColor = DAY_COLORS[(day.day_number - 1) % DAY_COLORS.length];
      let eventIndex = 1;
      for (const item of day.items) {
        let coords: [number, number] | null = null;

        if (item.lat !== null && item.lon !== null) {
          coords = [item.lat, item.lon];
        } else if (item.location) {
          coords = geocodedMap.get(item.location) ?? null;
        }

        if (coords !== null) {
          result.push({
            eventKey:   `${day.day_number}-${eventIndex}`,
            label:      item.title,
            time:       item.time,
            location:   item.location,
            coords,
            dayNumber:  day.day_number,
            eventIndex,
            dayColor,
          });
        }

        eventIndex++;
      }
    }
    return result;
  }, [itinerary, geocodedMap]);

  return { pins, loading };
}

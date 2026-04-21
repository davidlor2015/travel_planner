import { useState, useEffect, useMemo } from 'react';



interface NominatimResult {
  lat: string;
  lon: string;
}

export interface GeocodedPin {
  destination: string;
  coords: [number, number];
}

export interface GeocodeQuery {
  key: string;
  query: string;
  label?: string;
  fallbackQueries?: string[];
}



const geocodeCache = new Map<string, [number, number] | null>();


const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchCoords(destination: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'WaypointApp/1.0' } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as NominatimResult;
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    return isNaN(lat) || isNaN(lon) ? null : [lat, lon];
  } catch {
    return null;
  }
}

function buildPinsFromQueries(queries: GeocodeQuery[]): GeocodedPin[] {
  return queries.flatMap((item) => {
    const candidates = [item.query, ...(item.fallbackQueries ?? [])];
    for (const candidate of candidates) {
      const coords = geocodeCache.get(candidate);
      if (coords) {
        return [{ destination: item.label ?? item.key, coords }];
      }
    }
    return [];
  });
}

export function useGeocodeQueries(queries: GeocodeQuery[]): { pins: GeocodedPin[]; loading: boolean } {
  const [pins, setPins] = useState<GeocodedPin[]>([]);
  const [loading, setLoading] = useState(false);

  const stableKey = useMemo(
    () =>
      [...queries]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((item) => `${item.key}::${item.query}::${(item.fallbackQueries ?? []).join('|')}`)
        .join('||'),
    [queries],
  );

  useEffect(() => {
    const uniqueQueries = stableKey.length > 0
      ? stableKey.split('||').map((entry) => {
          const [key, query, fallbackBlob = ''] = entry.split('::');
          return {
            key,
            query,
            fallbackQueries: fallbackBlob ? fallbackBlob.split('|').filter(Boolean) : [],
          };
        })
      : [];

    const lookup = new Map(queries.map((item) => [item.key, item]));
    const orderedQueries = uniqueQueries
      .map((item) => lookup.get(item.key))
      .filter((item): item is GeocodeQuery => Boolean(item));

    let cancelled = false;

    (async () => {
      if (orderedQueries.length === 0) {
        setPins([]);
        return;
      }

      const toFetch = orderedQueries.flatMap((item) =>
        [item.query, ...(item.fallbackQueries ?? [])].filter((candidate) => !geocodeCache.has(candidate)),
      );
      const dedupedToFetch = [...new Set(toFetch)];

      if (dedupedToFetch.length > 0) {
        setLoading(true);
        for (let i = 0; i < dedupedToFetch.length; i++) {
          if (cancelled) break;
          if (i > 0) await sleep(1100);
          const coords = await fetchCoords(dedupedToFetch[i]);
          geocodeCache.set(dedupedToFetch[i], coords);
        }
      }

      if (!cancelled) {
        setPins(buildPinsFromQueries(orderedQueries));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queries, stableKey]);

  return { pins, loading };
}

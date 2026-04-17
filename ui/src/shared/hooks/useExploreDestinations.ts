import { useEffect, useMemo, useState } from 'react';
import {
  getExploreDestinations,
  type ExploreDestination,
  type ExploreDestinationsResult,
  type Region,
} from '../api/search';

interface UseExploreDestinationsResult {
  popular: ExploreDestination[];
  regions: Record<Exclude<Region, 'popular'>, ExploreDestination[]>;
  loading: boolean;
  error: string | null;
  scoresBySlug: Map<string, number>;
}

interface CacheEntry {
  data: ExploreDestinationsResult;
  fetchedAt: number;
}

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 30 * 60 * 1000;

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ExploreDestinationsResult>>();

const EMPTY_REGIONS: Record<Exclude<Region, 'popular'>, ExploreDestination[]> = {
  europe: [],
  asia: [],
  americas: [],
  africa: [],
  oceania: [],
};

function buildCacheKey(token: string, activeRegion: Region): string {
  return `${token.slice(-12)}:${activeRegion}`;
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < STALE_MS;
}

function sweepStaleCache(): void {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (now - entry.fetchedAt > GC_MS) {
      cache.delete(key);
    }
  });
}

function toScoresMap(data: ExploreDestinationsResult | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!data) return map;

  const all = [
    ...data.popular,
    ...data.regions.europe,
    ...data.regions.asia,
    ...data.regions.americas,
    ...data.regions.africa,
    ...data.regions.oceania,
  ];

  all.forEach((dest) => {
    if (typeof dest.teleport_score === 'number') {
      map.set(dest.slug, dest.teleport_score);
    }
  });

  return map;
}

export function useExploreDestinations(token: string, activeRegion: Region): UseExploreDestinationsResult {
  const cacheKey = buildCacheKey(token, activeRegion);
  const cached = cache.get(cacheKey);

  const [data, setData] = useState<ExploreDestinationsResult | undefined>(cached?.data);
  const [loading, setLoading] = useState(!cached || !isFresh(cached));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sweepStaleCache();

    const existing = cache.get(cacheKey);
    if (existing && isFresh(existing)) {
      setData(existing.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = inFlight.get(cacheKey) ?? getExploreDestinations(token, activeRegion);
    inFlight.set(cacheKey, request);

    request
      .then((resp) => {
        if (cancelled) return;
        cache.set(cacheKey, { data: resp, fetchedAt: Date.now() });
        setData(resp);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load destinations');
      })
      .finally(() => {
        inFlight.delete(cacheKey);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRegion, cacheKey, token]);

  const scoresBySlug = useMemo(() => toScoresMap(data), [data]);

  return {
    popular: data?.popular ?? [],
    regions: data?.regions ?? EMPTY_REGIONS,
    loading,
    error,
    scoresBySlug,
  };
}

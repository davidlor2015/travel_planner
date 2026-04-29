// Path: ui/src/features/trips/logistics/activity/tripActivityAdapter.ts
// Summary: Implements tripActivityAdapter module logic.

const READ_STORAGE_KEY = 'wp_trip_activity_read_v1';
const MUTED_STORAGE_KEY = 'wp_trip_activity_muted_v1';

type ReadStorage = Record<string, string[]>;

function loadReadStorage(): ReadStorage {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as ReadStorage;
    if (!parsed || typeof parsed !== 'object') return {};

    const cleaned: ReadStorage = {};
    for (const [tripId, ids] of Object.entries(parsed)) {
      cleaned[tripId] = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
    }

    return cleaned;
  } catch {
    return {};
  }
}

function saveReadStorage(next: ReadStorage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
}

export function loadReadActivityIds(tripId: number): string[] {
  const storage = loadReadStorage();
  return storage[String(tripId)] ?? [];
}

export function saveReadActivityIds(tripId: number, ids: string[]): void {
  const storage = loadReadStorage();
  storage[String(tripId)] = Array.from(new Set(ids));
  saveReadStorage(storage);
}

export function loadMutedTripIds(): number[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(MUTED_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value) => Number.isInteger(value));
  } catch {
    return [];
  }
}

export function saveMutedTripIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
}

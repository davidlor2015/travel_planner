import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TripOnTripSnapshot } from "../types";

const CACHE_PREFIX = "roen.ontrip.snapshot.v1";

export type OnTripSnapshotCacheRecord = {
  tripId: number;
  timezone: string;
  localDate: string;
  dayDate: string | null;
  dayNumber: number | null;
  savedAt: number;
  snapshot: TripOnTripSnapshot;
};

export type CacheStopStatusActor = {
  userId: number | null;
  displayName: string | null;
  email: string | null;
};

type CacheAddress = {
  key: string;
  timezone: string;
  localDate: string;
};

function resolveClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function resolveLocalDateISO(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // fall through to default local date formatting
  }
  return new Date().toISOString().slice(0, 10);
}

function buildCacheAddress(tripId: number): CacheAddress {
  const timezone = resolveClientTimezone();
  const localDate = resolveLocalDateISO(timezone);
  return {
    key: `${CACHE_PREFIX}:${tripId}:${timezone}:${localDate}`,
    timezone,
    localDate,
  };
}

function isTripOnTripSnapshot(value: unknown): value is TripOnTripSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TripOnTripSnapshot>;
  return (
    typeof record.generated_at === "string" &&
    Array.isArray(record.today_stops) &&
    Array.isArray(record.today_unplanned) &&
    Array.isArray(record.blockers) &&
    !!record.today &&
    !!record.next_stop &&
    (record.mode === "active" || record.mode === "inactive")
  );
}

function toCacheRecord(value: unknown): OnTripSnapshotCacheRecord | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<OnTripSnapshotCacheRecord>;
  if (
    typeof parsed.tripId !== "number" ||
    typeof parsed.timezone !== "string" ||
    typeof parsed.localDate !== "string" ||
    typeof parsed.savedAt !== "number" ||
    !isTripOnTripSnapshot(parsed.snapshot)
  ) {
    return null;
  }
  return {
    tripId: parsed.tripId,
    timezone: parsed.timezone,
    localDate: parsed.localDate,
    dayDate:
      typeof parsed.dayDate === "string" || parsed.dayDate === null
        ? parsed.dayDate
        : null,
    dayNumber: typeof parsed.dayNumber === "number" ? parsed.dayNumber : null,
    savedAt: parsed.savedAt,
    snapshot: parsed.snapshot,
  };
}

export async function readOnTripSnapshotCache(
  tripId: number,
): Promise<OnTripSnapshotCacheRecord | null> {
  const { key } = buildCacheAddress(tripId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return toCacheRecord(parsed);
  } catch {
    return null;
  }
}

export async function writeOnTripSnapshotCache(
  tripId: number,
  snapshot: TripOnTripSnapshot,
): Promise<OnTripSnapshotCacheRecord | null> {
  const address = buildCacheAddress(tripId);
  const nextRecord: OnTripSnapshotCacheRecord = {
    tripId,
    timezone: address.timezone,
    localDate: address.localDate,
    dayDate: snapshot.today.day_date ?? null,
    dayNumber: snapshot.today.day_number ?? null,
    savedAt: Date.now(),
    snapshot,
  };
  try {
    await AsyncStorage.setItem(address.key, JSON.stringify(nextRecord));
    return nextRecord;
  } catch {
    return null;
  }
}

function isUnresolvedStopForNext(snapshotStop: TripOnTripSnapshot["today_stops"][number]): boolean {
  const planStatus = (snapshotStop.status ?? "planned").trim().toLowerCase();
  if (planStatus === "skipped") return false;
  const execStatus = snapshotStop.execution_status;
  if (execStatus === "confirmed" || execStatus === "skipped") return false;
  return true;
}

export async function patchOnTripSnapshotCacheStopStatus(
  tripId: number,
  params: {
    stopRef: string;
    status: "confirmed" | "skipped" | "planned";
    actor: CacheStopStatusActor;
    updatedAt: string;
  },
): Promise<OnTripSnapshotCacheRecord | null> {
  const address = buildCacheAddress(tripId);
  try {
    const raw = await AsyncStorage.getItem(address.key);
    if (!raw) return null;
    const existing = toCacheRecord(JSON.parse(raw) as unknown);
    if (!existing) return null;

    let changed = false;
    const nextTodayStops = existing.snapshot.today_stops.map((stop) => {
      if (stop.stop_ref !== params.stopRef) return stop;
      changed = true;
      return {
        ...stop,
        execution_status: params.status,
        status_updated_by_user_id: params.actor.userId,
        status_updated_by_display_name: params.actor.displayName,
        status_updated_by_email: params.actor.email,
        status_updated_at: params.updatedAt,
      };
    });

    if (!changed) return existing;

    const nextToday = existing.snapshot.today.stop_ref === params.stopRef
      ? {
          ...existing.snapshot.today,
          execution_status: params.status,
          status_updated_by_user_id: params.actor.userId,
          status_updated_by_display_name: params.actor.displayName,
          status_updated_by_email: params.actor.email,
          status_updated_at: params.updatedAt,
        }
      : existing.snapshot.today;

    const nextStopUpdated =
      existing.snapshot.next_stop.stop_ref === params.stopRef
        ? {
            ...existing.snapshot.next_stop,
            execution_status: params.status,
            status_updated_by_user_id: params.actor.userId,
            status_updated_by_display_name: params.actor.displayName,
            status_updated_by_email: params.actor.email,
            status_updated_at: params.updatedAt,
          }
        : existing.snapshot.next_stop;

    const fallbackNextStop =
      nextTodayStops.find((stop) => isUnresolvedStopForNext(stop)) ?? nextStopUpdated;

    const nextRecord: OnTripSnapshotCacheRecord = {
      ...existing,
      savedAt: Date.now(),
      snapshot: {
        ...existing.snapshot,
        today: nextToday,
        today_stops: nextTodayStops,
        next_stop: fallbackNextStop,
      },
    };

    await AsyncStorage.setItem(address.key, JSON.stringify(nextRecord));
    return nextRecord;
  } catch {
    return null;
  }
}

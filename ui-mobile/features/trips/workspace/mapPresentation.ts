import type { Itinerary, ItineraryItem } from "@/features/ai/api";

export type MapFilterKey = "today" | "lodging" | "food" | "activities";

export const MAP_FILTERS: { key: MapFilterKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "lodging", label: "Lodging" },
  { key: "food", label: "Food" },
  { key: "activities", label: "Activities" },
];

export type MapStopCategory = "lodging" | "food" | "activities";
export type MapMarkerTone = "accent" | "olive" | "muted";

export type MapMarkerViewModel = {
  id: string;
  label: string;
  tone: MapMarkerTone;
  xPct: number;
  yPct: number;
};

export type MapNearbyStopViewModel = {
  id: string;
  title: string;
  subtitle: string;
  distanceLabel: string;
};

export type MapTabViewModel = {
  markers: MapMarkerViewModel[];
  nearbyStops: MapNearbyStopViewModel[];
  visibleStopCount: number;
  totalStopCount: number;
};

type FlattenedStop = {
  id: string;
  title: string;
  location: string | null;
  dayNumber: number;
  time: string | null;
  lat: number | null;
  lon: number | null;
  category: MapStopCategory;
  searchText: string;
  markerLabel: string;
  isToday: boolean;
};

type MarkerPoint = {
  id: string;
  xPct: number;
  yPct: number;
};

const MARKER_LABEL_STOP_WORDS = new Set([
  "the",
  "hotel",
  "hostel",
  "resort",
  "inn",
  "airbnb",
  "market",
  "temple",
  "taisha",
  "shrines",
  "shrine",
  "kyoto",
  "district",
  "station",
]);

function toLocalDateKey(input: Date): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveTodayDayNumber(itinerary: Itinerary): number | null {
  const today = toLocalDateKey(new Date());
  const exact = itinerary.days.find((day) => day.date === today);
  if (exact) return exact.day_number;
  return itinerary.days[0]?.day_number ?? null;
}

function classifyStopCategory(item: ItineraryItem): MapStopCategory {
  const text = `${item.title} ${item.location ?? ""} ${item.notes ?? ""}`.toLowerCase();
  if (/hotel|resort|check[-\s]?in|hostel|lodge|inn|airbnb|stay|lodging/.test(text)) {
    return "lodging";
  }
  if (
    /breakfast|brunch|lunch|dinner|restaurant|cafe|coffee|bar|tea|izakaya|food|meal|market|ramen|sushi/.test(
      text,
    )
  ) {
    return "food";
  }
  return "activities";
}

function toMarkerLabel(item: ItineraryItem): string {
  const raw = (item.location ?? item.title ?? "").trim();
  if (!raw) return "Stop";
  const words = raw
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);
  const candidate =
    words.find((word) => !MARKER_LABEL_STOP_WORDS.has(word.toLowerCase())) ??
    words[0] ??
    raw;
  return candidate.slice(0, 10);
}

function hasFiniteCoords(stop: Pick<FlattenedStop, "lat" | "lon">): boolean {
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lon);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max - min < 0.00001) return 0.5;
  return (value - min) / (max - min);
}

function haversineMiles(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const earthRadiusMiles = 3958.8;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const step =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const arc = 2 * Math.atan2(Math.sqrt(step), Math.sqrt(1 - step));
  return earthRadiusMiles * arc;
}

function buildMarkerPoints(stops: FlattenedStop[]): MarkerPoint[] {
  const mapped = stops.filter(hasFiniteCoords);
  if (mapped.length === 0) return [];

  const lats = mapped.map((stop) => stop.lat as number);
  const lons = mapped.map((stop) => stop.lon as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const pad = 0.12;

  return mapped.map((stop, index) => {
    const lonNormalized = normalize(stop.lon as number, minLon, maxLon);
    const latNormalized = normalize(stop.lat as number, minLat, maxLat);

    let x = pad + lonNormalized * (1 - pad * 2);
    let y = pad + (1 - latNormalized) * (1 - pad * 2);

    // Small deterministic jitter so overlapping points remain readable.
    const angle = (index * Math.PI) / 3;
    const radius = 0.015;
    x += Math.cos(angle) * radius;
    y += Math.sin(angle) * radius;

    return {
      id: stop.id,
      xPct: clamp(x * 100, 7, 93),
      yPct: clamp(y * 100, 16, 88),
    };
  });
}

function formatDayRange(dayNumbers: number[]): string {
  if (dayNumbers.length === 0) return "Day —";
  const sorted = [...new Set(dayNumbers)].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === last) return `Day ${first}`;
  return `Day ${first} — ${last}`;
}

function formatDistance(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (value >= 10) return `${Math.round(value)} mi`;
  return `${value.toFixed(1)} mi`;
}

function markerTone(stop: FlattenedStop): MapMarkerTone {
  if (stop.isToday) return "accent";
  if (stop.category === "activities" || stop.category === "food") return "olive";
  return "muted";
}

function toSubtitle(category: MapStopCategory, dayNumbers: number[]): string {
  const label =
    category === "lodging"
      ? "Lodging"
      : category === "food"
        ? "Food"
        : "Activity";
  return `${label} · ${formatDayRange(dayNumbers)}`;
}

function flattenStops(itinerary: Itinerary): FlattenedStop[] {
  const todayDayNumber = resolveTodayDayNumber(itinerary);
  return itinerary.days.flatMap((day, dayIndex) =>
    day.items.map((item, itemIndex) => {
      const category = classifyStopCategory(item);
      const markerLabel = toMarkerLabel(item);
      return {
        id: `${day.day_number}-${itemIndex}-${item.id ?? "stop"}`,
        title: item.title,
        location: item.location,
        dayNumber: day.day_number,
        time: item.time,
        lat: item.lat,
        lon: item.lon,
        category,
        markerLabel,
        searchText: `${item.title} ${item.location ?? ""} ${markerLabel}`.toLowerCase(),
        isToday: todayDayNumber != null && day.day_number === todayDayNumber,
      };
    }),
  );
}

function byFilter(stops: FlattenedStop[], filter: MapFilterKey): FlattenedStop[] {
  if (filter === "lodging") return stops.filter((stop) => stop.category === "lodging");
  if (filter === "food") return stops.filter((stop) => stop.category === "food");
  if (filter === "activities") return stops.filter((stop) => stop.category === "activities");

  const todayStops = stops.filter((stop) => stop.isToday);
  return todayStops.length > 0 ? todayStops : stops;
}

function byQuery(stops: FlattenedStop[], query: string): FlattenedStop[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return stops;
  return stops.filter((stop) => stop.searchText.includes(normalized));
}

export function buildMapTabViewModel(
  itinerary: Itinerary,
  options: {
    filter: MapFilterKey;
    query: string;
  },
): MapTabViewModel {
  const allStops = flattenStops(itinerary);
  const filtered = byQuery(byFilter(allStops, options.filter), options.query);
  const markerPoints = buildMarkerPoints(filtered);
  const markerById = new Map(markerPoints.map((marker) => [marker.id, marker]));

  const markers: MapMarkerViewModel[] = filtered
    .filter((stop) => markerById.has(stop.id))
    .slice(0, 8)
    .map((stop) => {
      const marker = markerById.get(stop.id) as MarkerPoint;
      return {
        id: stop.id,
        label: stop.markerLabel,
        tone: markerTone(stop),
        xPct: marker.xPct,
        yPct: marker.yPct,
      };
    });

  const mappedStops = filtered.filter(hasFiniteCoords);
  const reference = mappedStops.find((stop) => stop.isToday) ?? mappedStops[0] ?? null;

  const grouped = new Map<
    string,
    {
      id: string;
      title: string;
      category: MapStopCategory;
      dayNumbers: number[];
      distanceMiles: number | null;
      sortDistance: number;
    }
  >();

  filtered.forEach((stop) => {
    const key = (stop.location ?? stop.title).trim().toLowerCase();
    const distanceMiles =
      reference && hasFiniteCoords(stop)
        ? haversineMiles(
            reference.lat as number,
            reference.lon as number,
            stop.lat as number,
            stop.lon as number,
          )
        : null;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        id: stop.id,
        title: stop.location?.trim() || stop.title,
        category: stop.category,
        dayNumbers: [stop.dayNumber],
        distanceMiles,
        sortDistance: distanceMiles ?? Number.POSITIVE_INFINITY,
      });
      return;
    }

    existing.dayNumbers.push(stop.dayNumber);
    if ((distanceMiles ?? Number.POSITIVE_INFINITY) < existing.sortDistance) {
      existing.distanceMiles = distanceMiles;
      existing.sortDistance = distanceMiles ?? Number.POSITIVE_INFINITY;
    }
  });

  const nearbyStops: MapNearbyStopViewModel[] = [...grouped.values()]
    .sort((a, b) => a.sortDistance - b.sortDistance)
    .slice(0, 8)
    .map((stop) => ({
      id: stop.id,
      title: stop.title,
      subtitle: toSubtitle(stop.category, stop.dayNumbers),
      distanceLabel: formatDistance(stop.distanceMiles),
    }));

  return {
    markers,
    nearbyStops,
    visibleStopCount: filtered.length,
    totalStopCount: allStops.length,
  };
}

import type { StopVM } from "./adapters";

function toNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

export function buildNavigateUrl(stop: StopVM): string | null {
  const lat = toNumber(stop.lat);
  const lon = toNumber(stop.lon);
  if (lat != null && lon != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  }

  const query = [stop.location, stop.title]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

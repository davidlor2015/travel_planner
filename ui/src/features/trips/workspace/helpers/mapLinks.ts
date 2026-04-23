export type MapLinkStop = {
  title?: string | null;
  location?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type NavigatorLike = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

/**
 * Detect iOS-class devices (iPhone, iPad incl. iPadOS "Mac-like" UA, iPod).
 * Kept pure-ish so tests can inject a navigator-like object.
 */
export function isAppleMobile(navigatorLike?: NavigatorLike): boolean {
  const nav =
    navigatorLike ??
    (typeof navigator === "undefined"
      ? undefined
      : (navigator as unknown as NavigatorLike));
  if (!nav) return false;
  const ua = nav.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports "MacIntel" with touch support.
  const platform = nav.platform || "";
  const touchPoints = nav.maxTouchPoints ?? 0;
  return platform === "MacIntel" && touchPoints > 1;
}

function safeQuery(stop: MapLinkStop): string {
  return (stop.location || stop.title || "").trim();
}

function hasCoords(stop: MapLinkStop): stop is MapLinkStop & { lat: number; lon: number } {
  return typeof stop.lat === "number" && typeof stop.lon === "number";
}

export function mapsSearchHref(stop: MapLinkStop, nav?: NavigatorLike): string | null {
  if (hasCoords(stop)) {
    const coords = `${stop.lat},${stop.lon}`;
    if (isAppleMobile(nav)) return `maps://?q=${encodeURIComponent(coords)}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
  }

  const query = safeQuery(stop);
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  if (isAppleMobile(nav)) return `maps://?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export function mapsDirectionsHref(stop: MapLinkStop, nav?: NavigatorLike): string | null {
  if (hasCoords(stop)) {
    const coords = `${stop.lat},${stop.lon}`;
    const encoded = encodeURIComponent(coords);
    if (isAppleMobile(nav)) return `maps://?daddr=${encoded}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  }

  const query = safeQuery(stop);
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  if (isAppleMobile(nav)) return `maps://?daddr=${encoded}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}


// Path: ui/src/features/trips/map/ItineraryMap.tsx
// Summary: Implements ItineraryMap module logic.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import {
  BedDouble,
  BusFront,
  Compass,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { Itinerary } from "../../../shared/api/ai";
import { useItineraryPins, type ItineraryPin } from "./useItineraryPins";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItineraryMapProps {
  itinerary: Itinerary;
}

type PinRole = "stay" | "transport" | "dining" | "activity" | "leisure";

interface RoleStyle {
  label: string;
  text: string;
  border: string;
  background: string;
  icon: LucideIcon;
}

const ROLE_STYLES: Record<PinRole, RoleStyle> = {
  stay: {
    label: "Stay",
    text: "#6D4C3A",
    border: "#E8D8C9",
    background: "#FAF0E8",
    icon: BedDouble,
  },
  transport: {
    label: "Transport",
    text: "#5A6A3A",
    border: "#D6DFC2",
    background: "#F2F7E8",
    icon: BusFront,
  },
  dining: {
    label: "Dining",
    text: "#7A3F2D",
    border: "#EAD2C8",
    background: "#FAEEE8",
    icon: UtensilsCrossed,
  },
  activity: {
    label: "Activity",
    text: "#445F3B",
    border: "#D4E0CF",
    background: "#EFF5EC",
    icon: Compass,
  },
  leisure: {
    label: "Leisure",
    text: "#6D5A49",
    border: "#E3D9CF",
    background: "#F8F4EF",
    icon: Sparkles,
  },
};

const MAX_VISIBLE_MARKERS = 24;

function inferPinRole(pin: ItineraryPin): PinRole {
  const context = `${pin.label} ${pin.location ?? ""}`.toLowerCase();

  if (
    /hotel|check[- ]?in|resort|airbnb|hostel|villa|apartment|stay|lodge/.test(
      context,
    )
  ) {
    return "stay";
  }
  if (
    /flight|airport|train|station|bus|ferry|taxi|transfer|metro|tram|drive/.test(
      context,
    )
  ) {
    return "transport";
  }
  if (
    /dinner|lunch|breakfast|brunch|restaurant|cafe|bar|wine|eat|tasting/.test(
      context,
    )
  ) {
    return "dining";
  }
  if (
    /museum|tour|hike|temple|gallery|class|walk|visit|market|beach|park|trail/.test(
      context,
    )
  ) {
    return "activity";
  }

  return "leisure";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a numbered circular DivIcon in the day's brand colour.
 * Called per-marker during render — DivIcons are cheap to instantiate.
 */
function createPin(number: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.22);
      display:flex;align-items:center;justify-content:center;
      font-family:Manrope,sans-serif;font-weight:800;font-size:11px;color:#fff;
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

// ── BoundsFitter ──────────────────────────────────────────────────────────────

/**
 * Inner component that reactively fits the map viewport to all pin coords.
 * Must be rendered inside a MapContainer so useMap() is in scope.
 */
const BoundsFitter = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (coords.length === 0) return;
    map.fitBounds(coords, { padding: [48, 48], maxZoom: 13 });
  }, [map, coords]);

  return null;
};

// ── DayLegend ─────────────────────────────────────────────────────────────────

const DayLegend = ({ pins }: { pins: ItineraryPin[] }) => {
  // Collect unique days in order.
  const days = useMemo(() => {
    const seen = new Map<number, string>();
    for (const p of pins) {
      if (!seen.has(p.dayNumber)) seen.set(p.dayNumber, p.dayColor);
    }
    return [...seen.entries()].sort(([a], [b]) => a - b);
  }, [pins]);

  if (days.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {days.map(([dayNum, color]) => (
        <span
          key={dayNum}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold"
          style={{ borderColor: `${color}40`, color, background: `${color}12` }}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          Day {dayNum}
        </span>
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const ItineraryMap = ({ itinerary }: ItineraryMapProps) => {
  const { pins, loading } = useItineraryPins(itinerary);
  const visiblePins = useMemo(() => pins.slice(0, MAX_VISIBLE_MARKERS), [pins]);
  const hiddenPinCount = Math.max(0, pins.length - visiblePins.length);

  // Group pins by day for per-day polylines.
  const polylines = useMemo(() => {
    const byDay = new Map<
      number,
      { coords: [number, number][]; color: string }
    >();
    for (const pin of visiblePins) {
      const existing = byDay.get(pin.dayNumber);
      if (existing) {
        existing.coords.push(pin.coords);
      } else {
        byDay.set(pin.dayNumber, { coords: [pin.coords], color: pin.dayColor });
      }
    }
    return [...byDay.values()];
  }, [visiblePins]);

  const allCoords = useMemo(
    () => visiblePins.map((p) => p.coords),
    [visiblePins],
  );
  const destinationChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pin of pins) {
      if (!pin.location) continue;
      const location = pin.location.trim();
      counts.set(location, (counts.get(location) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([location, count]) => ({ location, count }));
  }, [pins]);

  const spotlightStops = useMemo(() => {
    return visiblePins.slice(0, 8).map((pin) => {
      const role = inferPinRole(pin);
      return {
        pin,
        role,
        roleStyle: ROLE_STYLES[role],
      };
    });
  }, [visiblePins]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 h-56 rounded-2xl bg-parchment/70 text-flint text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-amber border-t-transparent animate-spin flex-shrink-0" />
        Locating activities...
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-2xl border-2 border-dashed border-smoke text-flint text-sm">
        No mappable locations in this itinerary.
      </div>
    );
  }

  // Use the first pin's coords as a safe fallback center (overridden by BoundsFitter).
  const fallbackCenter = visiblePins[0].coords;

  return (
    <section className="mt-3 rounded-2xl border border-[#E7DDD1] bg-[#FDFBF8] p-3 sm:p-4">
      <MapContainer
        center={fallbackCenter}
        zoom={12}
        style={{ height: "320px", width: "100%", borderRadius: "16px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <BoundsFitter coords={allCoords} />

        {polylines.map((line, i) =>
          line.coords.length > 1 ? (
            <Polyline
              key={i}
              positions={line.coords}
              pathOptions={{
                color: line.color,
                weight: 2.5,
                opacity: 0.6,
                dashArray: "6 4",
              }}
            />
          ) : null,
        )}

        {visiblePins.map((pin) => (
          <Marker
            key={pin.eventKey}
            position={pin.coords}
            icon={createPin(pin.eventIndex, pin.dayColor)}
          >
            <Popup>
              <div
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: "0.8125rem",
                  minWidth: "140px",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    color: "#1C1917",
                    marginBottom: "2px",
                  }}
                >
                  {pin.label}
                </p>
                {pin.time && (
                  <p style={{ color: "#78716C", fontSize: "0.75rem" }}>
                    {pin.time}
                  </p>
                )}
                {pin.location && (
                  <p style={{ color: "#78716C", fontSize: "0.75rem" }}>
                    {pin.location}
                  </p>
                )}
                <p
                  style={{
                    color: pin.dayColor,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    marginTop: "4px",
                  }}
                >
                  Day {pin.dayNumber}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {destinationChips.map((chip) => (
          <span
            key={chip.location}
            className="inline-flex min-h-7 items-center rounded-full border border-[#E5DDD1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6B5E52]"
          >
            {chip.location}
            {chip.count > 1 ? ` · ${chip.count}` : ""}
          </span>
        ))}
      </div>

      <DayLegend pins={visiblePins} />

      {hiddenPinCount > 0 ? (
        <p className="mt-2 text-[11px] text-[#8A7E74]">
          Showing the first {MAX_VISIBLE_MARKERS} stops to keep the map
          readable. {hiddenPinCount} more stop{hiddenPinCount === 1 ? "" : "s"}{" "}
          remain in your day plan.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {spotlightStops.map(({ pin, role, roleStyle }) => {
          const RoleIcon = roleStyle.icon;
          return (
            <article
              key={`spotlight-${pin.eventKey}`}
              className="rounded-xl border border-[#E8DED1] bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-[#1C1108]">
                  {pin.label}
                </p>
                <span
                  className="inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    color: roleStyle.text,
                    borderColor: roleStyle.border,
                    background: roleStyle.background,
                  }}
                >
                  <RoleIcon size={12} strokeWidth={2} />
                  {roleStyle.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7B6C5E]">
                Day {pin.dayNumber}
                {pin.time ? ` · ${pin.time}` : ""}
                {pin.location ? ` · ${pin.location}` : ""}
              </p>
              {role === "transport" ? (
                <p className="mt-1 text-[11px] text-[#8A7E74]">
                  Best reviewed with nearby departure points and transfer
                  timing.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};

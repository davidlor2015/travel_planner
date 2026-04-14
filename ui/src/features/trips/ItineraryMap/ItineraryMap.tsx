import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import type { Itinerary } from '../../../shared/api/ai';
import { useItineraryPins, type ItineraryPin } from './useItineraryPins';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItineraryMapProps {
  itinerary: Itinerary;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a numbered circular DivIcon in the day's brand colour.
 * Called per-marker during render — DivIcons are cheap to instantiate.
 */
function createPin(number: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.22);
      display:flex;align-items:center;justify-content:center;
      font-family:Manrope,sans-serif;font-weight:800;font-size:11px;color:#fff;
    ">${number}</div>`,
    iconSize:     [28, 28],
    iconAnchor:   [14, 14],
    popupAnchor:  [0, -18],
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

  // Group pins by day for per-day polylines.
  const polylines = useMemo(() => {
    const byDay = new Map<number, { coords: [number, number][]; color: string }>();
    for (const pin of pins) {
      const existing = byDay.get(pin.dayNumber);
      if (existing) {
        existing.coords.push(pin.coords);
      } else {
        byDay.set(pin.dayNumber, { coords: [pin.coords], color: pin.dayColor });
      }
    }
    return [...byDay.values()];
  }, [pins]);

  const allCoords = useMemo(() => pins.map((p) => p.coords), [pins]);

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
  const fallbackCenter = pins[0].coords;

  return (
    <div className="space-y-1 mt-3">
      <MapContainer
        center={fallbackCenter}
        zoom={12}
        style={{ height: '300px', width: '100%', borderRadius: '16px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <BoundsFitter coords={allCoords} />

        {/* Per-day route polylines */}
        {polylines.map((line, i) =>
          line.coords.length > 1 ? (
            <Polyline
              key={i}
              positions={line.coords}
              pathOptions={{ color: line.color, weight: 2.5, opacity: 0.6, dashArray: '6 4' }}
            />
          ) : null,
        )}

        {/* Numbered event markers */}
        {pins.map((pin) => (
          <Marker
            key={pin.eventKey}
            position={pin.coords}
            icon={createPin(pin.eventIndex, pin.dayColor)}
          >
            <Popup>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.8125rem', minWidth: '140px' }}>
                <p style={{ fontWeight: 700, color: '#1C1917', marginBottom: '2px' }}>{pin.label}</p>
                {pin.time && (
                  <p style={{ color: '#78716C', fontSize: '0.75rem' }}>{pin.time}</p>
                )}
                {pin.location && (
                  <p style={{ color: '#78716C', fontSize: '0.75rem' }}>{pin.location}</p>
                )}
                <p style={{ color: pin.dayColor, fontWeight: 700, fontSize: '0.75rem', marginTop: '4px' }}>
                  Day {pin.dayNumber}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <DayLegend pins={pins} />
    </div>
  );
};

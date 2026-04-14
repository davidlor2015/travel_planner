import { motion } from 'framer-motion';
import type { Itinerary } from '../../../shared/api/ai';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItineraryPanelProps {
  itinerary: Itinerary;
  onApply?: () => void;
  applying?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ItineraryPanel = ({ itinerary, onApply, applying }: ItineraryPanelProps) => (
  <div className="mt-2 rounded-2xl border border-amber/20 bg-amber/5 overflow-hidden">

    {/* Header */}
    <div className="px-5 pt-5 pb-4 border-b border-amber/10">
      <h4 className="text-base font-bold text-espresso leading-tight">{itinerary.title}</h4>
      <p className="text-sm text-flint mt-1 leading-relaxed">{itinerary.summary}</p>
    </div>

    {/* Days */}
    <div className="divide-y divide-amber/10">
      {itinerary.days.map((day) => (
        <div key={day.day_number} className="px-5 py-4 space-y-3">

          {/* Day header */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-espresso text-ivory text-xs font-extrabold flex-shrink-0">
              {day.day_number}
            </span>
            <span className="text-sm font-bold text-espresso">
              Day {day.day_number}
              {day.date && (
                <span className="ml-1.5 text-flint font-normal">{day.date}</span>
              )}
            </span>
          </div>

          {/* Events */}
          <div className="space-y-2.5 pl-9">
            {day.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-xl bg-white border border-smoke/60 px-4 py-3 shadow-sm"
              >
                {/* Left */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.time && (
                      <span className="px-2 py-0.5 rounded-full bg-amber/20 text-amber text-xs font-bold flex-shrink-0">
                        {item.time}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-espresso truncate">{item.title}</span>
                  </div>
                  {item.location && (
                    <span className="text-xs text-flint flex items-center gap-1 mt-0.5">
                      <svg viewBox="0 0 20 20" className="w-3 h-3 flex-shrink-0 text-flint" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {item.location}
                    </span>
                  )}
                  {item.notes && (
                    <span className="text-xs text-flint italic mt-0.5 leading-relaxed">{item.notes}</span>
                  )}
                </div>

                {/* Cost */}
                {item.cost_estimate && (
                  <span className="flex-shrink-0 text-xs font-bold text-olive bg-olive/10 px-2.5 py-1 rounded-full self-start">
                    {item.cost_estimate}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Apply button */}
    {onApply && (
      <div className="px-5 py-4 border-t border-amber/10">
        <motion.button
          onClick={onApply}
          disabled={applying}
          whileHover={!applying ? { scale: 1.02 } : undefined}
          whileTap={!applying ? { scale: 0.97 } : undefined}
          className="w-full py-3 rounded-full bg-amber text-white text-sm font-bold
                     shadow-sm shadow-amber/25 hover:bg-amber-dark transition-colors duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {applying ? 'Saving…' : 'Apply Itinerary to Trip'}
        </motion.button>
      </div>
    )}
  </div>
);

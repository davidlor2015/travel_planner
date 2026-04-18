import { useState } from 'react';
import { motion } from 'framer-motion';
import type { EditableItinerary, RefinementTimeBlock, RefinementVariant } from '../itineraryDraft';

interface EditableItineraryPanelProps {
  itinerary: EditableItinerary;
  applying?: boolean;
  regenerating?: boolean;
  lockedItemIds: string[];
  favoriteItemIds: string[];
  regenerateDayNumber: number;
  regenerateTimeBlock: RefinementTimeBlock;
  regenerateVariant: RefinementVariant;
  onApply: () => void;
  onMoveItem: (sourceDayNumber: number, sourceIndex: number, targetDayNumber: number, targetIndex: number) => void;
  onToggleLock: (itemId: string) => void;
  onToggleFavorite: (itemId: string) => void;
  onRegenerateDayChange: (dayNumber: number) => void;
  onRegenerateTimeBlockChange: (timeBlock: RefinementTimeBlock) => void;
  onRegenerateVariantChange: (variant: RefinementVariant) => void;
  onRegenerate: () => void;
}

const TIME_BLOCK_OPTIONS: Array<{ value: RefinementTimeBlock; label: string }> = [
  { value: 'full_day', label: 'Full day' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const VARIANT_OPTIONS: Array<{ value: RefinementVariant; label: string }> = [
  { value: 'faster_pace', label: 'Faster pace' },
  { value: 'cheaper', label: 'Cheaper' },
  { value: 'more_local', label: 'More local' },
  { value: 'less_walking', label: 'Less walking' },
];

export const EditableItineraryPanel = ({
  itinerary,
  applying,
  regenerating,
  lockedItemIds,
  favoriteItemIds,
  regenerateDayNumber,
  regenerateTimeBlock,
  regenerateVariant,
  onApply,
  onMoveItem,
  onToggleLock,
  onToggleFavorite,
  onRegenerateDayChange,
  onRegenerateTimeBlockChange,
  onRegenerateVariantChange,
  onRegenerate,
}: EditableItineraryPanelProps) => {
  const [dragState, setDragState] = useState<{ sourceDayNumber: number; sourceIndex: number } | null>(null);
  const lockedSet = new Set(lockedItemIds);
  const favoriteSet = new Set(favoriteItemIds);

  return (
    <div className="mt-2 rounded-2xl border border-amber/20 bg-amber/5 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-amber/10 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-base font-bold text-espresso leading-tight">{itinerary.title}</h4>
            <span className="inline-flex items-center rounded-full bg-white border border-smoke px-3 py-1 text-xs font-semibold text-flint">
              Draft itinerary
            </span>
          </div>
          <p className="text-sm text-flint mt-1 leading-relaxed">{itinerary.summary}</p>
        </div>

        <div className="rounded-2xl border border-smoke/80 bg-white px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-espresso">Regenerate part of this draft</p>
              <p className="text-xs text-flint mt-1">Locked items stay in view while the selected day or time block is rewritten by the AI.</p>
            </div>
            <motion.button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              whileHover={!regenerating ? { scale: 1.02 } : undefined}
              whileTap={!regenerating ? { scale: 0.97 } : undefined}
              className="px-4 py-2 rounded-full bg-clay text-white text-sm font-semibold shadow-sm shadow-clay/20 hover:bg-clay-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {regenerating ? 'Refreshing…' : 'Regenerate selection'}
            </motion.button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-flint">Day</span>
              <select
                value={regenerateDayNumber}
                onChange={(event) => onRegenerateDayChange(Number(event.target.value))}
                className="w-full rounded-xl border border-smoke bg-parchment/60 px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
              >
                {itinerary.days.map((day) => (
                  <option key={day.day_number} value={day.day_number}>
                    Day {day.day_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-flint">Scope</span>
              <select
                value={regenerateTimeBlock}
                onChange={(event) => onRegenerateTimeBlockChange(event.target.value as RefinementTimeBlock)}
                className="w-full rounded-xl border border-smoke bg-parchment/60 px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
              >
                {TIME_BLOCK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-flint">Variant</span>
              <select
                value={regenerateVariant}
                onChange={(event) => onRegenerateVariantChange(event.target.value as RefinementVariant)}
                className="w-full rounded-xl border border-smoke bg-parchment/60 px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
              >
                {VARIANT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="divide-y divide-amber/10">
        {itinerary.days.map((day) => (
          <div key={day.day_number} className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-espresso text-ivory text-xs font-extrabold flex-shrink-0">
                {day.day_number}
              </span>
              <span className="text-sm font-bold text-espresso">
                Day {day.day_number}
                {day.date && <span className="ml-1.5 text-flint font-normal">{day.date}</span>}
              </span>
            </div>

            <div
              className="space-y-2.5 pl-9"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragState) {
                  onMoveItem(dragState.sourceDayNumber, dragState.sourceIndex, day.day_number, day.items.length);
                  setDragState(null);
                }
              }}
            >
              {day.items.map((item, index) => {
                const isLocked = lockedSet.has(item.client_id);
                const isFavorite = favoriteSet.has(item.client_id);

                return (
                  <div
                    key={item.client_id}
                    draggable
                    onDragStart={() => setDragState({ sourceDayNumber: day.day_number, sourceIndex: index })}
                    onDragEnd={() => setDragState(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragState) {
                        onMoveItem(dragState.sourceDayNumber, dragState.sourceIndex, day.day_number, index);
                        setDragState(null);
                      }
                    }}
                    className="flex items-start justify-between gap-4 rounded-xl bg-white border border-smoke/60 px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.time && (
                          <span className="px-2 py-0.5 rounded-full bg-amber/20 text-amber text-xs font-bold flex-shrink-0">
                            {item.time}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-espresso truncate">{item.title}</span>
                        {isLocked && (
                          <span className="px-2 py-0.5 rounded-full bg-clay/10 text-clay text-[11px] font-bold">Locked</span>
                        )}
                        {isFavorite && (
                          <span className="px-2 py-0.5 rounded-full bg-olive/10 text-olive text-[11px] font-bold">Favorite</span>
                        )}
                      </div>
                      {item.location && <span className="text-xs text-flint mt-0.5">{item.location}</span>}
                      {item.notes && <span className="text-xs text-flint mt-0.5 leading-relaxed">{item.notes}</span>}
                    </div>

                    <div className="flex flex-col gap-2 items-end flex-shrink-0">
                      {item.cost_estimate && (
                        <span className="text-xs font-bold text-olive bg-olive/10 px-2.5 py-1 rounded-full">
                          {item.cost_estimate}
                        </span>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.client_id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                            isFavorite
                              ? 'border-olive/20 bg-olive/10 text-olive'
                              : 'border-smoke bg-parchment text-flint hover:text-espresso'
                          }`}
                        >
                          Favorite
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleLock(item.client_id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                            isLocked
                              ? 'border-clay/20 bg-clay/10 text-clay'
                              : 'border-smoke bg-parchment text-flint hover:text-espresso'
                          }`}
                        >
                          {isLocked ? 'Unlock' : 'Lock'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-dashed border-smoke bg-parchment/30 px-4 py-3 text-xs text-flint">
                Drag items here to reorder within the day or move them from another day.
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-amber/10">
        <motion.button
          onClick={onApply}
          disabled={applying}
          whileHover={!applying ? { scale: 1.02 } : undefined}
          whileTap={!applying ? { scale: 0.97 } : undefined}
          className="w-full py-3 rounded-full bg-amber text-white text-sm font-bold shadow-sm shadow-amber/25 hover:bg-amber-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {applying ? 'Saving…' : 'Apply Itinerary to Trip'}
        </motion.button>
      </div>
    </div>
  );
};

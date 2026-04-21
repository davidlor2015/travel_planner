import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EditableItineraryDayCard } from "./EditableItineraryDayCard";
import { EditableTimelineStopRow } from "./EditableTimelineStopRow";
import { ItineraryDraftHeader } from "./ItineraryDraftHeader";
import type {
  DraftAiAssistRequest,
  EditableItinerary,
  EditableItineraryItem,
  RefinementTimeBlock,
  RefinementVariant,
} from "../itineraryDraft";
import { buildDayPanelMeta } from "../workspace/itineraryEditorModels";
import { ITINERARY_DRAFT_PUBLISH_ANCHOR_ID } from "../workspace/itineraryEditorAnchors";

interface EditableItineraryPanelProps {
  itinerary: EditableItinerary;
  /** Optional override when draft meta is tracked separately from itinerary fields */
  draftSourceLabel?: string | null;
  draftFallbackUsed?: boolean | null;
  applying?: boolean;
  draftMutationState?: "idle" | "saving" | "saved";
  regenerating?: boolean;
  lockedItemIds: string[];
  favoriteItemIds: string[];
  regenerateDayNumber: number;
  regenerateTimeBlock: RefinementTimeBlock;
  regenerateVariant: RefinementVariant;
  onApply: () => void;
  onMoveItem: (
    sourceDayNumber: number,
    sourceIndex: number,
    targetDayNumber: number,
    targetIndex: number,
  ) => void;
  onUpdateDay?: (
    dayNumber: number,
    patch: Partial<
      Pick<EditableItinerary["days"][number], "day_title" | "day_note" | "date">
    >,
  ) => void;
  onAddStop?: (dayNumber: number, insertAfterIndex?: number) => void;
  onUpdateStop?: (
    dayNumber: number,
    stopId: string,
    patch: Partial<Omit<EditableItineraryItem, "client_id">>,
  ) => void;
  onDeleteStop?: (dayNumber: number, stopId: string) => void;
  onDuplicateStop?: (dayNumber: number, stopId: string) => void;
  onReorderStopWithinDay?: (
    dayNumber: number,
    sourceIndex: number,
    targetIndex: number,
  ) => void;
  onDuplicateDay?: (dayNumber: number) => void;
  onClearDay?: (dayNumber: number) => void;
  onDayToggle?: (dayNumber: number, isOpen: boolean) => void;
  onToggleLock: (itemId: string) => void;
  onToggleFavorite: (itemId: string) => void;
  onRegenerateDayChange: (dayNumber: number) => void;
  onRegenerateTimeBlockChange: (timeBlock: RefinementTimeBlock) => void;
  onRegenerateVariantChange: (variant: RefinementVariant) => void;
  onRegenerate: () => void;
  onRunAiAssist?: (request: DraftAiAssistRequest) => void;
  onAddDay: () => void;
  /** Last draft publish / assist mutation error (from workspace status). */
  publishError?: string | null;
  /** Mobile-oriented stop editing and drag affordances. */
  isMobileLayout?: boolean;
}

const TIME_BLOCK_OPTIONS: Array<{ value: RefinementTimeBlock; label: string }> =
  [
    { value: "full_day", label: "Full day" },
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
  ];

const VARIANT_OPTIONS: Array<{ value: RefinementVariant; label: string }> = [
  { value: "faster_pace", label: "Faster pace" },
  { value: "cheaper", label: "Cheaper" },
  { value: "more_local", label: "More local" },
  { value: "less_walking", label: "Less walking" },
];

const AI_ASSIST_ACTIONS: Array<{
  action: DraftAiAssistRequest["action"];
  label: string;
  detail: string;
  needsStop?: boolean;
}> = [
  {
    action: "regenerate_day",
    label: "Re-suggest this day",
    detail: "Ask for a fresh pass on the chosen day; locked stops stay put.",
  },
  {
    action: "stop_alternatives",
    label: "Alternatives for one stop",
    detail: "Swap ideas for a single stop while keeping the rest of the day.",
    needsStop: true,
  },
  {
    action: "fill_gaps",
    label: "Fill light spots",
    detail: "Suggest stops where the day still feels empty or vague.",
  },
  {
    action: "rebalance_pacing",
    label: "Ease pacing",
    detail: "Soften density and long stretches—still your call to accept.",
  },
  {
    action: "route_optimization",
    label: "Less walking (preview)",
    detail: "Preview a lower-walking order; confirm before treating as final.",
  },
];

function InsertBetweenTrigger({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/insert flex items-center gap-2 py-1 pl-9">
      <div className="h-px flex-1 bg-smoke/40 transition-colors group-hover/insert:bg-amber/25" />
      <button
        type="button"
        onClick={onInsert}
        aria-label="Insert stop here"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-smoke/80 bg-parchment/40 text-flint opacity-70 transition-all hover:border-amber/40 hover:bg-amber/5 hover:text-amber hover:opacity-100"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path
            d="M4 1v6M1 4h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="h-px flex-1 bg-smoke/40 transition-colors group-hover/insert:bg-amber/25" />
    </div>
  );
}

export const EditableItineraryPanel = ({
  itinerary,
  draftSourceLabel,
  draftFallbackUsed,
  applying,
  draftMutationState = "idle",
  regenerating,
  lockedItemIds,
  favoriteItemIds,
  regenerateDayNumber,
  regenerateTimeBlock,
  regenerateVariant,
  onApply,
  onMoveItem,
  onUpdateDay,
  onAddStop,
  onUpdateStop,
  onDeleteStop,
  onDuplicateStop,
  onReorderStopWithinDay,
  onDuplicateDay,
  onClearDay,
  onDayToggle,
  onToggleLock,
  onToggleFavorite,
  onRegenerateDayChange,
  onRegenerateTimeBlockChange,
  onRegenerateVariantChange,
  onRegenerate,
  onRunAiAssist,
  onAddDay,
  publishError,
  isMobileLayout = false,
}: EditableItineraryPanelProps) => {
  const [dragState, setDragState] = useState<{
    dayNumber: number;
    index: number;
  } | null>(null);
  const [editingDayDetails, setEditingDayDetails] = useState<number | null>(
    null,
  );
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [assistStopId, setAssistStopId] = useState<string | null>(null);

  const lockedSet = new Set(lockedItemIds);
  const favoriteSet = new Set(favoriteItemIds);

  const selectedDay =
    itinerary.days.find((day) => day.day_number === regenerateDayNumber) ??
    itinerary.days[0];
  const selectedStopOptions = useMemo(
    () => selectedDay?.items ?? [],
    [selectedDay],
  );
  const selectedAssistStopId = useMemo(() => {
    if (
      assistStopId &&
      selectedStopOptions.some((item) => item.client_id === assistStopId)
    ) {
      return assistStopId;
    }
    return selectedStopOptions[0]?.client_id ?? null;
  }, [assistStopId, selectedStopOptions]);
  const selectedAssistStop =
    selectedStopOptions.find((item) => item.client_id === selectedAssistStopId) ??
    null;

  const variantLabel =
    VARIANT_OPTIONS.find((option) => option.value === regenerateVariant)
      ?.label ?? "More local";
  const scopeLabel =
    TIME_BLOCK_OPTIONS.find((option) => option.value === regenerateTimeBlock)
      ?.label ?? "Full day";

  const handleReorder = (
    dayNumber: number,
    sourceIndex: number,
    targetIndex: number,
  ) => {
    if (sourceIndex === targetIndex) return;
    if (onReorderStopWithinDay) {
      onReorderStopWithinDay(dayNumber, sourceIndex, targetIndex);
      return;
    }
    onMoveItem(dayNumber, sourceIndex, dayNumber, targetIndex);
  };

  const updateDayField = (
    dayNumber: number,
    patch: Partial<
      Pick<EditableItinerary["days"][number], "day_title" | "day_note" | "date">
    >,
  ) => {
    onUpdateDay?.(dayNumber, patch);
  };

  const runAssistAction = (request: DraftAiAssistRequest) => {
    if (!onRunAiAssist || regenerating) return;
    onRunAiAssist(request);
  };

  const openAssistForDay = (dayNumber: number) => {
    onRegenerateDayChange(dayNumber);
    setShowAiAssist(true);
  };

  const sourceLabel =
    (draftSourceLabel ?? itinerary.source_label)?.trim() || "Draft";
  const fallbackUsed =
    draftFallbackUsed ?? Boolean(itinerary.fallback_used);
  const editControlsDisabled = Boolean(applying);

  return (
    <div
      className="mt-2 overflow-hidden rounded-2xl border border-smoke/60 bg-white shadow-[0_8px_30px_rgba(28,17,8,0.04)]"
      aria-busy={Boolean(applying)}
    >
      <ItineraryDraftHeader
        title={itinerary.title}
        summary={itinerary.summary}
        sourceLabel={sourceLabel}
        fallbackUsed={fallbackUsed}
        onAddDay={onAddDay}
        onOpenGlobalAiAssist={() => setShowAiAssist(true)}
        globalAiDisabled={regenerating}
      />

      {/* Assist drawer */}
      {showAiAssist ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-espresso/30 px-3 py-3 backdrop-blur-sm sm:px-5 sm:py-5">
          <button
            type="button"
            aria-label="Close assist panel"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowAiAssist(false)}
          />
          <motion.aside
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-smoke bg-[#FEFCF9] shadow-2xl"
            aria-label="Itinerary assist drawer"
          >
            <div className="border-b border-smoke px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="text-base font-bold text-espresso">
                    Itinerary assist
                  </h5>
                  <p className="mt-1 text-xs leading-relaxed text-flint">
                    Suggestions land in this draft only. Publish when the group
                    is happy with the plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiAssist(false)}
                  className="rounded-full border border-smoke bg-white px-3 py-1.5 text-xs font-semibold text-flint transition-colors hover:bg-parchment hover:text-espresso cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-smoke bg-white px-3 py-2 text-xs font-semibold text-flint">
                {selectedDay ? `Day ${selectedDay.day_number}` : "Day"} ·{" "}
                {scopeLabel} · {variantLabel}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <div className="grid gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase text-flint">
                      Selected day
                    </span>
                    <select
                      value={regenerateDayNumber}
                      onChange={(event) =>
                        onRegenerateDayChange(Number(event.target.value))
                      }
                      className="w-full rounded-xl border border-smoke bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
                    >
                      {itinerary.days.map((day) => (
                        <option key={day.day_number} value={day.day_number}>
                          Day {day.day_number}
                          {day.day_title ? ` - ${day.day_title}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase text-flint">
                      Stop for alternatives
                    </span>
                    <select
                      value={selectedAssistStopId ?? ""}
                      onChange={(event) => setAssistStopId(event.target.value)}
                      disabled={selectedStopOptions.length === 0}
                      className="w-full rounded-xl border border-smoke bg-white px-3 py-2 text-sm text-espresso disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber/25"
                    >
                      {selectedStopOptions.length === 0 ? (
                        <option value="">No stops on this day</option>
                      ) : (
                        selectedStopOptions.map((item, index) => (
                          <option key={item.client_id} value={item.client_id}>
                            {index + 1}. {item.title}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  {AI_ASSIST_ACTIONS.map((action) => {
                    const disabled =
                      regenerating ||
                      !onRunAiAssist ||
                      (action.needsStop && !selectedAssistStop);
                    return (
                      <button
                        key={action.action}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          runAssistAction({
                            action: action.action,
                            dayNumber: regenerateDayNumber,
                            stopId: action.needsStop
                              ? selectedAssistStop?.client_id
                              : undefined,
                          })
                        }
                        className="w-full rounded-xl border border-smoke bg-white px-3 py-3 text-left transition-colors hover:bg-parchment/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        <span className="block text-sm font-semibold text-espresso">
                          {action.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-flint">
                          {action.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-smoke bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase text-flint">
                    Fine-tune assist scope
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-flint">
                        Scope
                      </span>
                      <select
                        value={regenerateTimeBlock}
                        onChange={(event) =>
                          onRegenerateTimeBlockChange(
                            event.target.value as RefinementTimeBlock,
                          )
                        }
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
                      <span className="text-xs font-semibold text-flint">
                        Variant
                      </span>
                      <select
                        value={regenerateVariant}
                        onChange={(event) =>
                          onRegenerateVariantChange(
                            event.target.value as RefinementVariant,
                          )
                        }
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
                  <motion.button
                    type="button"
                    onClick={onRegenerate}
                    disabled={regenerating}
                    whileHover={!regenerating ? { scale: 1.02 } : undefined}
                    whileTap={!regenerating ? { scale: 0.97 } : undefined}
                    className="mt-3 w-full rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-clay/20 transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {regenerating
                      ? "Running assist…"
                      : regenerateTimeBlock === "full_day"
                        ? "Run assist on full day"
                        : "Run assist on selection"}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}

      <div className="space-y-6 px-4 pb-4 pt-2 sm:px-5">
        {itinerary.days.map((day) => {
          const meta = buildDayPanelMeta(day);
          const stopCount = day.items.length;

          const emptyState =
            day.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-smoke/80 bg-parchment/25 px-4 py-8 text-center">
                <p className="text-sm font-medium text-espresso">
                  Nothing planned for this day yet
                </p>
                <p className="mt-1 text-[13px] text-flint">
                  Add a stop by hand, or ask for light-touch ideas for this day.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAddStop?.(day.day_number)}
                    className="rounded-full border border-smoke bg-white px-4 py-2 text-sm font-semibold text-espresso hover:bg-parchment"
                  >
                    Add first stop
                  </button>
                  <button
                    type="button"
                    disabled={regenerating || !onRunAiAssist}
                    onClick={() =>
                      runAssistAction({
                        action: "fill_gaps",
                        dayNumber: day.day_number,
                      })
                    }
                    className="rounded-full border border-amber/40 bg-amber/10 px-4 py-2 text-sm font-semibold text-espresso hover:bg-amber/18 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Assist this day
                  </button>
                </div>
              </div>
            ) : null;

          const dayDetailsSummary =
            meta.dayPreview && editingDayDetails !== day.day_number ? (
              <p className="mt-3 text-[13px] leading-relaxed text-flint/95">
                {meta.dayPreview}
              </p>
            ) : null;

          const dayDetailsForm =
            editingDayDetails === day.day_number ? (
              <div className="mt-3 grid gap-3 rounded-xl border border-smoke/50 bg-parchment/20 px-3 py-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={day.day_title ?? ""}
                  onChange={(event) =>
                    updateDayField(day.day_number, {
                      day_title: event.target.value || null,
                    })
                  }
                  placeholder={`Title for day ${day.day_number}`}
                  className="w-full rounded-xl border border-smoke/70 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
                />
                <input
                  type="date"
                  value={day.date ?? ""}
                  onChange={(event) =>
                    updateDayField(day.day_number, {
                      date: event.target.value || null,
                    })
                  }
                  className="w-full rounded-xl border border-smoke/70 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
                />
                <textarea
                  value={day.day_note ?? ""}
                  onChange={(event) =>
                    updateDayField(day.day_number, {
                      day_note: event.target.value || null,
                    })
                  }
                  placeholder="Goals, pacing, or reminders for this day."
                  rows={2}
                  className="sm:col-span-2 w-full rounded-xl border border-smoke/70 bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25 resize-none"
                />
              </div>
            ) : null;

          const moreMenu = (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full border border-smoke/70 bg-white px-3 py-2 text-[12px] font-semibold text-flint hover:bg-parchment [&::-webkit-details-marker]:hidden">
                More
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-smoke bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => onDuplicateDay?.(day.day_number)}
                  disabled={!onDuplicateDay}
                  className="block w-full px-3 py-2 text-left text-sm text-espresso hover:bg-parchment disabled:opacity-40"
                >
                  Duplicate day
                </button>
                <button
                  type="button"
                  onClick={() => onClearDay?.(day.day_number)}
                  disabled={!onClearDay || stopCount === 0}
                  className="block w-full px-3 py-2 text-left text-sm text-danger/90 hover:bg-danger/5 disabled:opacity-40"
                >
                  Clear stops
                </button>
              </div>
            </details>
          );

          const timeline =
            day.items.length > 0 ? (
              <div className="space-y-0">
                {day.items.map((item, index) => (
                  <Fragment key={item.client_id}>
                    {index > 0 && (
                      <InsertBetweenTrigger
                        onInsert={() =>
                          onAddStop?.(day.day_number, index - 1)
                        }
                      />
                    )}
                    <EditableTimelineStopRow
                      item={item}
                      index={index}
                      totalStops={day.items.length}
                      isLast={index === day.items.length - 1}
                      isLocked={lockedSet.has(item.client_id)}
                      isFavorite={favoriteSet.has(item.client_id)}
                      useStopEditBottomSheet={isMobileLayout}
                      interactionDisabled={editControlsDisabled}
                      onUpdate={(patch) =>
                        onUpdateStop?.(day.day_number, item.client_id, patch)
                      }
                      onDelete={() =>
                        onDeleteStop?.(day.day_number, item.client_id)
                      }
                      onDuplicate={() =>
                        onDuplicateStop?.(day.day_number, item.client_id)
                      }
                      onMoveUp={() =>
                        handleReorder(
                          day.day_number,
                          index,
                          Math.max(0, index - 1),
                        )
                      }
                      onMoveDown={() =>
                        handleReorder(
                          day.day_number,
                          index,
                          Math.min(day.items.length - 1, index + 1),
                        )
                      }
                      onAddAfter={() => onAddStop?.(day.day_number, index)}
                      onToggleLock={() => onToggleLock(item.client_id)}
                      onToggleFavorite={() => onToggleFavorite(item.client_id)}
                      onDragStart={() =>
                        setDragState({
                          dayNumber: day.day_number,
                          index,
                        })
                      }
                      onDragEnd={() => setDragState(null)}
                      onDragOver={(event) => {
                        if (dragState?.dayNumber === day.day_number) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (
                          !dragState ||
                          dragState.dayNumber !== day.day_number
                        )
                          return;
                        handleReorder(
                          day.day_number,
                          dragState.index,
                          index,
                        );
                        setDragState(null);
                      }}
                    />
                  </Fragment>
                ))}
              </div>
            ) : null;

          const addStopRow =
            day.items.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  onAddStop?.(day.day_number, day.items.length - 1)
                }
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-smoke/70 py-2.5 text-[12px] font-medium text-flint transition-colors hover:border-amber/35 hover:bg-amber/5 hover:text-espresso"
              >
                <span className="text-lg leading-none">+</span>
                Add stop
              </button>
            ) : null;

          const dropEnd =
            day.items.length > 1 ? (
              <div
                className="mt-2 rounded-lg border border-dashed border-transparent px-3 py-2 text-center text-[11px] text-flint/80 hover:border-smoke/50"
                onDragOver={(event) => {
                  if (dragState?.dayNumber === day.day_number) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (
                    !dragState ||
                    dragState.dayNumber !== day.day_number
                  )
                    return;
                  handleReorder(
                    day.day_number,
                    dragState.index,
                    day.items.length - 1,
                  );
                  setDragState(null);
                }}
              >
                Drop here to move to end of day
              </div>
            ) : null;

          return (
            <EditableItineraryDayCard
              key={day.day_number}
              dayNumber={day.day_number}
              dayTitle={meta.dayLabel}
              formattedDate={meta.formattedDate}
              metaLine={meta.metaLine}
              onAssistThisDay={() => {
                openAssistForDay(day.day_number);
                onDayToggle?.(day.day_number, true);
              }}
              assistDisabled={regenerating}
              onToggleEditDetails={() => {
                setEditingDayDetails((prev) =>
                  prev === day.day_number ? null : day.day_number,
                );
                onDayToggle?.(day.day_number, true);
              }}
              editingDetails={editingDayDetails === day.day_number}
              dayDetailsSummary={dayDetailsSummary}
              dayDetailsForm={dayDetailsForm}
              emptyState={emptyState}
              moreMenu={moreMenu}
            >
              <>
                {timeline}
                {addStopRow}
                {dropEnd}
              </>
            </EditableItineraryDayCard>
          );
        })}
      </div>

      <div
        id={ITINERARY_DRAFT_PUBLISH_ANCHOR_ID}
        className="sticky bottom-0 z-10 border-t border-smoke/60 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md scroll-mt-24"
      >
        <p className="mb-2 text-center text-[11px] text-flint/90">
          Publish when this draft is the plan your group should follow.
        </p>
        {draftMutationState === "saved" ? (
          <p className="mb-3 rounded-xl border border-olive/25 bg-olive/10 px-3 py-2 text-center text-[12px] font-medium text-olive">
            Draft published successfully.
          </p>
        ) : null}
        {publishError?.trim() ? (
          <p
            className="mb-3 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-center text-[12px] font-medium text-danger"
            role="alert"
          >
            {publishError.trim()}
          </p>
        ) : null}
        <motion.button
          type="button"
          onClick={onApply}
          disabled={applying}
          aria-busy={applying}
          whileHover={!applying ? { scale: 1.02 } : undefined}
          whileTap={!applying ? { scale: 0.97 } : undefined}
          className="w-full rounded-full bg-espresso py-3 text-sm font-bold text-white shadow-sm shadow-espresso/25 transition-colors duration-150 hover:bg-espresso/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {applying ? "Publishing…" : "Publish itinerary"}
        </motion.button>
      </div>
    </div>
  );
};

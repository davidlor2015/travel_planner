import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inputCls } from "../../../shared/ui/inputCls";
import type { ItineraryStopStatus } from "../../../shared/api/ai";
import {
  applyStopOwnershipMetadata,
  extractStopOwnershipMetadata,
  normalizeStopStatus,
  type EditableItineraryItem,
} from "../itineraryDraft";
import {
  buildStopRowViewModel,
  htmlTimeFromStoredTime,
  shouldUseHtmlTimeInput,
} from "../workspace/itineraryEditorModels";

export interface EditableTimelineStopRowProps {
  dayNumber: number;
  availableDayNumbers: number[];
  item: EditableItineraryItem;
  index: number;
  totalStops: number;
  isLast: boolean;
  timeHint?: string | null;
  readinessHint?: string | null;
  isLocked: boolean;
  isFavorite: boolean;
  showOwnershipControls?: boolean;
  /** Disable manual edit controls while draft publish is in-flight. */
  interactionDisabled?: boolean;
  onUpdate: (patch: Partial<Omit<EditableItineraryItem, "client_id">>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToPreviousDay?: () => void;
  onMoveToNextDay?: () => void;
  onMoveToDay?: (targetDayNumber: number) => void;
  onAddAfter: () => void;
  onToggleLock: () => void;
  onToggleFavorite: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const STOP_STATUS_OPTIONS: { value: ItineraryStopStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "skipped", label: "Skipped" },
];

function DragHandle({
  onDragStart,
  onDragEnd,
  disabled,
}: {
  onDragStart: () => void;
  onDragEnd: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="flex min-h-11 min-w-11 cursor-grab flex-col items-center justify-center rounded-lg border border-transparent pt-0.5 transition-colors hover:border-smoke/40 hover:bg-parchment/30 active:cursor-grabbing disabled:cursor-not-allowed"
      aria-label="Drag to reorder stop"
      aria-disabled={disabled}
    >
      <svg
        width="14"
        height="20"
        viewBox="0 0 10 16"
        fill="none"
        className="text-[#A39688]"
        aria-hidden
      >
        <circle cx="3" cy="3" r="1.5" fill="currentColor" />
        <circle cx="7" cy="3" r="1.5" fill="currentColor" />
        <circle cx="3" cy="8" r="1.5" fill="currentColor" />
        <circle cx="7" cy="8" r="1.5" fill="currentColor" />
        <circle cx="3" cy="13" r="1.5" fill="currentColor" />
        <circle cx="7" cy="13" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

const pillCls =
  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer";
const ghostPillCls = `${pillCls} border-smoke/80 bg-white text-flint hover:bg-parchment hover:text-espresso`;
const dangerPillCls = `${pillCls} border-danger/20 bg-danger/5 text-danger hover:bg-danger/10`;

function StopStatusSelect({
  value,
  onChange,
}: {
  value: ItineraryStopStatus;
  onChange: (next: ItineraryStopStatus) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1">
      <span className="sr-only">Stop status</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ItineraryStopStatus)}
        className="max-w-[7.5rem] rounded-md border border-smoke/70 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
      >
        {STOP_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StopEditFormBody({
  item,
  useHtmlTime,
  htmlTimeValue,
  onUpdate,
  isLocked,
  isFavorite,
  showOwnershipControls,
  onToggleLock,
  onToggleFavorite,
  onAddAfter,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToDay,
  index,
  totalStops,
  showMobileReorder,
  disabled,
  dayNumber,
  availableDayNumbers,
}: {
  item: EditableItineraryItem;
  useHtmlTime: boolean;
  htmlTimeValue: string;
  onUpdate: (patch: Partial<Omit<EditableItineraryItem, "client_id">>) => void;
  isLocked: boolean;
  isFavorite: boolean;
  showOwnershipControls: boolean;
  onToggleLock: () => void;
  onToggleFavorite: () => void;
  onAddAfter: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToPreviousDay?: () => void;
  onMoveToNextDay?: () => void;
  onMoveToDay?: (targetDayNumber: number) => void;
  index: number;
  totalStops: number;
  showMobileReorder: boolean;
  disabled: boolean;
  dayNumber: number;
  availableDayNumbers: number[];
}) {
  const targetableDays = useMemo(
    () => availableDayNumbers.filter((candidate) => candidate !== dayNumber),
    [availableDayNumbers, dayNumber],
  );
  const [selectedMoveDay, setSelectedMoveDay] = useState<number | null>(
    targetableDays[0] ?? null,
  );
  const effectiveSelectedMoveDay =
    selectedMoveDay != null && targetableDays.includes(selectedMoveDay)
      ? selectedMoveDay
      : targetableDays[0] ?? null;

  const ownership = extractStopOwnershipMetadata(item.notes, {
    handledBy: item.handled_by ?? null,
    bookedBy: item.booked_by ?? null,
  });

  return (
    <div className="space-y-2.5 border-t border-smoke/40 pt-3">
      {showMobileReorder ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Move up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || index === totalStops - 1}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Move down
          </button>
          <button
            type="button"
            onClick={onMoveToPreviousDay}
            disabled={disabled || !onMoveToPreviousDay}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Prev day
          </button>
          <button
            type="button"
            onClick={onMoveToNextDay}
            disabled={disabled || !onMoveToNextDay}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Next day
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="min-h-10 flex-1 rounded-full border border-danger/25 bg-danger/5 px-3 text-[12px] font-semibold text-danger"
          >
            Delete
          </button>
        </div>
      ) : null}
      {showMobileReorder && targetableDays.length > 0 && onMoveToDay ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor={`move-day-${item.client_id}`}>
            Move stop to day
          </label>
          <select
            id={`move-day-${item.client_id}`}
            value={effectiveSelectedMoveDay ?? ""}
            onChange={(event) => setSelectedMoveDay(Number(event.target.value))}
            disabled={disabled}
            className={inputCls()}
          >
            {targetableDays.map((candidate) => (
              <option key={candidate} value={candidate}>
                Move to Day {candidate}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || effectiveSelectedMoveDay == null}
            onClick={() => {
              if (effectiveSelectedMoveDay == null) return;
              onMoveToDay(effectiveSelectedMoveDay);
            }}
            className="min-h-10 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Move
          </button>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        {useHtmlTime ? (
          <input
            type="time"
            value={htmlTimeValue}
            disabled={disabled}
            onChange={(e) => onUpdate({ time: e.target.value || null })}
            className={inputCls()}
          />
        ) : (
          <input
            type="text"
            value={item.time ?? ""}
            disabled={disabled}
            onChange={(e) => onUpdate({ time: e.target.value || null })}
            placeholder="Time (e.g. 9:00 or Morning)"
            className={inputCls()}
          />
        )}
        <input
          type="text"
          value={item.title}
          disabled={disabled}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Stop title"
          className={inputCls()}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={item.location ?? ""}
          disabled={disabled}
          onChange={(e) => onUpdate({ location: e.target.value || null })}
          placeholder="Location"
          className={inputCls()}
        />
        <input
          type="text"
          value={item.cost_estimate ?? ""}
          disabled={disabled}
          onChange={(e) => onUpdate({ cost_estimate: e.target.value || null })}
          placeholder="Cost estimate"
          className={inputCls()}
        />
      </div>
      <textarea
        value={ownership.plainNotes ?? ""}
        disabled={disabled}
        onChange={(e) =>
          onUpdate({
            notes: applyStopOwnershipMetadata(e.target.value || null, ownership.metadata),
          })
        }
        placeholder="Notes"
        rows={2}
        className={`${inputCls()} resize-none`}
      />
      {showOwnershipControls ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={ownership.metadata.handledBy ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onUpdate({
                handled_by: e.target.value || null,
                notes: applyStopOwnershipMetadata(ownership.plainNotes, ownership.metadata),
              })
            }
            placeholder="Handled by"
            className={inputCls()}
          />
          <input
            type="text"
            value={ownership.metadata.bookedBy ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onUpdate({
                booked_by: e.target.value || null,
                notes: applyStopOwnershipMetadata(ownership.plainNotes, ownership.metadata),
              })
            }
            placeholder="Booked by"
            className={inputCls()}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <StopStatusSelect
          value={normalizeStopStatus(item.status)}
          onChange={(next) => onUpdate({ status: next })}
        />
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={disabled}
          className={`${pillCls} ${
            isFavorite
              ? "border-olive/20 bg-olive/10 text-olive"
              : "border-smoke bg-white text-flint hover:bg-parchment"
          }`}
        >
          {isFavorite ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          onClick={onToggleLock}
          disabled={disabled}
          className={`${pillCls} ${
            isLocked
              ? "border-clay/20 bg-clay/10 text-clay"
              : "border-smoke bg-white text-flint hover:bg-parchment"
          }`}
        >
          {isLocked ? "Locked" : "Lock"}
        </button>
        <span className="mx-0.5 h-4 w-px bg-smoke" aria-hidden />
        <button
          type="button"
          onClick={onAddAfter}
          disabled={disabled}
          className={ghostPillCls}
        >
          Add after
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={disabled}
          className={ghostPillCls}
        >
          Duplicate
        </button>
        {!showMobileReorder ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className={dangerPillCls}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EditableTimelineStopRow({
  dayNumber,
  availableDayNumbers,
  item,
  index,
  totalStops,
  isLast,
  timeHint,
  readinessHint,
  isLocked,
  isFavorite,
  showOwnershipControls = false,
  interactionDisabled = false,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToDay,
  onAddAfter,
  onToggleLock,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: EditableTimelineStopRowProps) {
  const [isEditing, setIsEditing] = useState(false);

  const vm = useMemo(
    () =>
      buildStopRowViewModel(item, {
        isLocked,
        isFavorite,
      }),
    [item, isLocked, isFavorite],
  );

  const useHtmlTime = shouldUseHtmlTimeInput(item.time);
  const htmlTimeValue = htmlTimeFromStoredTime(item.time);

  useEffect(() => {
    if (!isEditing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditing]);

  // The mobile stop edit previously opened in a portal-mounted bottom sheet.
  // Modals made every edit feel ceremonial and reinforced "draft = AI output
  // you review." Now the row expands inline at every breakpoint — editing the
  // trip is indistinguishable from reading it.

  return (
    <div
      className={[
        "group/stop flex gap-0",
        vm.stopStatus === "skipped" ? "opacity-[0.88]" : "",
      ].join(" ")}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex w-11 shrink-0 flex-col items-center sm:w-9">
        <DragHandle
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          disabled={interactionDisabled}
        />
        <div
          className="mt-1 h-2 w-2 shrink-0 rounded-full border border-espresso/20 bg-espresso/90"
          aria-hidden
        />
        {!isLast ? (
          <div
            className="mt-1 min-h-[12px] w-px flex-1 bg-gradient-to-b from-smoke/70 to-smoke/30"
            aria-hidden
          />
        ) : (
          <div className="h-3 shrink-0" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div
          className={[
            "rounded-xl px-2 py-2 transition-colors",
            isEditing
              ? "bg-parchment/50 ring-1 ring-smoke/60"
              : "hover:bg-parchment/35",
          ].join(" ")}
        >
          <div className="flex items-start gap-2 sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {vm.timeBadge.kind === "fixed" ? (
                  <span className="text-[12px] font-semibold tabular-nums text-espresso">
                    {vm.timeBadge.label}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-flint/80">
                    Flexible
                  </span>
                )}
                <span
                  className={[
                    "text-[14px] font-semibold leading-snug text-espresso",
                    vm.stopStatus === "skipped" ? "line-through decoration-smoke" : "",
                  ].join(" ")}
                >
                  {vm.showUntitled ? (
                    <span className="font-normal italic text-flint">
                      Untitled stop
                    </span>
                  ) : (
                    vm.displayTitle
                  )}
                </span>
              </div>
              {vm.secondaryLine ? (
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-flint">
                  {vm.secondaryLine}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rounded-md border border-smoke/60 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flint/90">
                  {vm.category}
                </span>
                <span
                  className={[
                    "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    vm.stopStatus === "confirmed"
                      ? "border-olive/30 bg-olive/10 text-olive"
                      : vm.stopStatus === "skipped"
                        ? "border-smoke/60 bg-smoke/15 text-flint"
                        : "border-amber/25 bg-amber/10 text-amber",
                  ].join(" ")}
                >
                  {vm.stopStatusLabel}
                </span>
                {vm.costDisplay ? (
                  <span className="text-[11px] font-medium text-olive/90">
                    {vm.costDisplay}
                  </span>
                ) : null}
                {timeHint ? (
                  <span className="text-[10px] font-semibold text-amber">
                    {timeHint}
                  </span>
                ) : null}
                {readinessHint ? (
                  <span className="text-[10px] font-semibold text-danger">
                    {readinessHint}
                  </span>
                ) : null}
                {showOwnershipControls && vm.handledBy ? (
                  <span className="text-[10px] font-semibold text-flint/90">
                    Handled: {vm.handledBy}
                  </span>
                ) : null}
                {showOwnershipControls && vm.bookedBy ? (
                  <span className="text-[10px] font-semibold text-flint/90">
                    Booked: {vm.bookedBy}
                  </span>
                ) : null}
                {vm.showLocked ? (
                  <span className="text-[10px] font-semibold text-clay">
                    Locked
                  </span>
                ) : null}
                {vm.showFavorite ? (
                  <span className="text-[10px] font-semibold text-olive">
                    Saved
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/*
                Reorder + delete controls are always visible at every
                breakpoint. The prior pattern hid them behind hover on desktop
                and behind the mobile edit sheet on mobile — both signalled
                "editing is a mode you enter," which breaks the manual-first
                feel we want.
               */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={interactionDisabled || index === 0}
                  aria-label="Move stop up"
                  className="rounded-md border border-transparent p-1.5 text-flint hover:border-smoke hover:bg-white disabled:opacity-25"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 6.5L5 3.5L8 6.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={interactionDisabled || index === totalStops - 1}
                  aria-label="Move stop down"
                  className="rounded-md border border-transparent p-1.5 text-flint hover:border-smoke hover:bg-white disabled:opacity-25"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 3.5L5 6.5L8 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onMoveToPreviousDay}
                  disabled={interactionDisabled || !onMoveToPreviousDay}
                  aria-label="Move stop to previous day"
                  className="hidden rounded-md border border-transparent p-1.5 text-flint hover:border-smoke hover:bg-white disabled:opacity-25 sm:inline-flex"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M6.5 2L3.5 5L6.5 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onMoveToNextDay}
                  disabled={interactionDisabled || !onMoveToNextDay}
                  aria-label="Move stop to next day"
                  className="hidden rounded-md border border-transparent p-1.5 text-flint hover:border-smoke hover:bg-white disabled:opacity-25 sm:inline-flex"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3.5 2L6.5 5L3.5 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={interactionDisabled}
                  aria-label="Delete stop"
                  className="rounded-md border border-transparent p-1.5 text-danger hover:bg-danger/10"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 2L8 8M8 2L2 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                disabled={interactionDisabled}
                onClick={() => setIsEditing((v) => !v)}
                className={`min-h-9 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isEditing
                    ? "bg-espresso text-white"
                    : "border border-smoke/70 bg-white text-flint hover:bg-parchment"
                }`}
              >
                {isEditing ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isEditing ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <StopEditFormBody
                    item={item}
                    useHtmlTime={useHtmlTime}
                    htmlTimeValue={htmlTimeValue}
                    onUpdate={onUpdate}
                    isLocked={isLocked}
                    isFavorite={isFavorite}
                    showOwnershipControls={showOwnershipControls}
                    onToggleLock={onToggleLock}
                    onToggleFavorite={onToggleFavorite}
                    onAddAfter={() => {
                      onAddAfter();
                      setIsEditing(false);
                    }}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onMoveToPreviousDay={onMoveToPreviousDay}
                    onMoveToNextDay={onMoveToNextDay}
                    onMoveToDay={onMoveToDay}
                    index={index}
                    totalStops={totalStops}
                    showMobileReorder={false}
                    disabled={interactionDisabled}
                    dayNumber={dayNumber}
                    availableDayNumbers={availableDayNumbers}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

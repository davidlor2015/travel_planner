import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { inputCls } from "../../../shared/ui/inputCls";
import type { ItineraryStopStatus } from "../../../shared/api/ai";
import {
  normalizeStopStatus,
  type EditableItinerary,
  type EditableItineraryItem,
} from "../itineraryDraft";
import {
  buildStopRowViewModel,
  htmlTimeFromStoredTime,
  shouldUseHtmlTimeInput,
} from "../workspace/itineraryEditorModels";

export interface EditableTimelineStopRowProps {
  item: EditableItineraryItem;
  index: number;
  totalStops: number;
  isLast: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  /** When true, full stop edit opens in a bottom sheet (mobile). */
  useStopEditBottomSheet?: boolean;
  moveTargetDays: Array<
    Pick<EditableItinerary["days"][number], "day_number" | "day_title">
  >;
  onUpdate: (patch: Partial<Omit<EditableItineraryItem, "client_id">>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: () => void;
  onMoveToDay: (targetDayNumber: number) => void;
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
}: {
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="flex min-h-11 min-w-11 cursor-grab flex-col items-center justify-center rounded-lg border border-transparent pt-0.5 transition-colors hover:border-smoke/40 hover:bg-parchment/30 active:cursor-grabbing"
      aria-label="Drag to reorder stop"
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
  onToggleLock,
  onToggleFavorite,
  onAddAfter,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  index,
  totalStops,
  moveTargetDays,
  resolvedMoveTarget,
  setMoveTarget,
  onMoveToDay,
  showMobileReorder,
}: {
  item: EditableItineraryItem;
  useHtmlTime: boolean;
  htmlTimeValue: string;
  onUpdate: (patch: Partial<Omit<EditableItineraryItem, "client_id">>) => void;
  isLocked: boolean;
  isFavorite: boolean;
  onToggleLock: () => void;
  onToggleFavorite: () => void;
  onAddAfter: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  index: number;
  totalStops: number;
  moveTargetDays: Array<
    Pick<EditableItinerary["days"][number], "day_number" | "day_title">
  >;
  resolvedMoveTarget: number;
  setMoveTarget: (n: number) => void;
  onMoveToDay: (targetDayNumber: number) => void;
  showMobileReorder: boolean;
}) {
  return (
    <div className="space-y-2.5 border-t border-smoke/40 pt-3">
      {showMobileReorder ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Move up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalStops - 1}
            className="min-h-10 flex-1 rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-espresso disabled:opacity-30"
          >
            Move down
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-10 flex-1 rounded-full border border-danger/25 bg-danger/5 px-3 text-[12px] font-semibold text-danger"
          >
            Delete
          </button>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        {useHtmlTime ? (
          <input
            type="time"
            value={htmlTimeValue}
            onChange={(e) => onUpdate({ time: e.target.value || null })}
            className={inputCls()}
          />
        ) : (
          <input
            type="text"
            value={item.time ?? ""}
            onChange={(e) => onUpdate({ time: e.target.value || null })}
            placeholder="Time (e.g. 9:00 or Morning)"
            className={inputCls()}
          />
        )}
        <input
          type="text"
          value={item.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Stop title"
          className={inputCls()}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={item.location ?? ""}
          onChange={(e) => onUpdate({ location: e.target.value || null })}
          placeholder="Location"
          className={inputCls()}
        />
        <input
          type="text"
          value={item.cost_estimate ?? ""}
          onChange={(e) => onUpdate({ cost_estimate: e.target.value || null })}
          placeholder="Cost estimate"
          className={inputCls()}
        />
      </div>
      <textarea
        value={item.notes ?? ""}
        onChange={(e) => onUpdate({ notes: e.target.value || null })}
        placeholder="Notes"
        rows={2}
        className={`${inputCls()} resize-none`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <StopStatusSelect
          value={normalizeStopStatus(item.status)}
          onChange={(next) => onUpdate({ status: next })}
        />
        <button
          type="button"
          onClick={onToggleFavorite}
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
          className={`${pillCls} ${
            isLocked
              ? "border-clay/20 bg-clay/10 text-clay"
              : "border-smoke bg-white text-flint hover:bg-parchment"
          }`}
        >
          {isLocked ? "Locked" : "Lock"}
        </button>
        <span className="mx-0.5 h-4 w-px bg-smoke" aria-hidden />
        <button type="button" onClick={onAddAfter} className={ghostPillCls}>
          Add after
        </button>
        <button type="button" onClick={onDuplicate} className={ghostPillCls}>
          Duplicate
        </button>
        {moveTargetDays.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <select
              value={resolvedMoveTarget}
              onChange={(e) => setMoveTarget(Number(e.target.value))}
              className="rounded-full border border-smoke bg-white px-2 py-1 text-[11px] font-semibold text-espresso focus:outline-none focus:ring-2 focus:ring-amber/25"
            >
              {moveTargetDays.map((d) => (
                <option key={d.day_number} value={d.day_number}>
                  Day {d.day_number}
                  {d.day_title ? ` — ${d.day_title}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onMoveToDay(resolvedMoveTarget)}
              className={ghostPillCls}
            >
              Move
            </button>
          </div>
        ) : null}
        {!showMobileReorder ? (
          <button type="button" onClick={onDelete} className={dangerPillCls}>
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EditableTimelineStopRow({
  item,
  index,
  totalStops,
  isLast,
  isLocked,
  isFavorite,
  useStopEditBottomSheet = false,
  moveTargetDays,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddAfter,
  onMoveToDay,
  onToggleLock,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: EditableTimelineStopRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [moveTarget, setMoveTarget] = useState<number>(
    moveTargetDays[0]?.day_number ?? 0,
  );

  const resolvedMoveTarget = moveTargetDays.some(
    (d) => d.day_number === moveTarget,
  )
    ? moveTarget
    : (moveTargetDays[0]?.day_number ?? 0);

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

  useEffect(() => {
    if (!isEditing || !useStopEditBottomSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isEditing, useStopEditBottomSheet]);

  const closeEdit = () => setIsEditing(false);

  const sheet =
    isEditing &&
    useStopEditBottomSheet &&
    typeof document !== "undefined" ? (
      createPortal(
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            aria-label="Close stop editor"
            className="absolute inset-0 bg-espresso/35 backdrop-blur-[1px]"
            onClick={closeEdit}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`stop-edit-${item.client_id}`}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-smoke/80 bg-[#FEFCF9] px-4 pt-3 shadow-[0_-12px_40px_rgba(28,17,8,0.12)] pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-smoke/70"
              aria-hidden
            />
            <h4
              id={`stop-edit-${item.client_id}`}
              className="text-sm font-semibold text-espresso"
            >
              Edit stop
            </h4>
            <StopEditFormBody
              item={item}
              useHtmlTime={useHtmlTime}
              htmlTimeValue={htmlTimeValue}
              onUpdate={onUpdate}
              isLocked={isLocked}
              isFavorite={isFavorite}
              onToggleLock={onToggleLock}
              onToggleFavorite={onToggleFavorite}
              onAddAfter={() => {
                onAddAfter();
                closeEdit();
              }}
              onDuplicate={onDuplicate}
              onDelete={() => {
                onDelete();
                closeEdit();
              }}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              index={index}
              totalStops={totalStops}
              moveTargetDays={moveTargetDays}
              resolvedMoveTarget={resolvedMoveTarget}
              setMoveTarget={setMoveTarget}
              onMoveToDay={onMoveToDay}
              showMobileReorder
            />
            <button
              type="button"
              onClick={closeEdit}
              className="mt-4 w-full min-h-11 rounded-full bg-espresso py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Done
            </button>
          </motion.div>
        </div>,
        document.body,
      )
    ) : null;

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
        <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
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
            isEditing && !useStopEditBottomSheet
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
              <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover/stop:opacity-100 sm:flex">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={index === 0}
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
                  disabled={index === totalStops - 1}
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
                  onClick={onDelete}
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
            {isEditing && !useStopEditBottomSheet ? (
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
                    onToggleLock={onToggleLock}
                    onToggleFavorite={onToggleFavorite}
                    onAddAfter={() => {
                      onAddAfter();
                      closeEdit();
                    }}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    index={index}
                    totalStops={totalStops}
                    moveTargetDays={moveTargetDays}
                    resolvedMoveTarget={resolvedMoveTarget}
                    setMoveTarget={setMoveTarget}
                    onMoveToDay={onMoveToDay}
                    showMobileReorder={false}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      {sheet}
    </div>
  );
}

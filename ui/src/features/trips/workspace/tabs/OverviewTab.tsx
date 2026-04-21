import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableItineraryPanel } from "../../EditableItineraryPanel";
import type { Trip } from "../../../../shared/api/trips";
import type { Itinerary } from "../../../../shared/api/ai";
import type { TripActivityItem } from "../../TripActivity";
import type {
  DraftAiAssistRequest,
  EditableItinerary,
  EditableItineraryItem,
  RefinementTimeBlock,
  RefinementVariant,
} from "../../itineraryDraft";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../types";
import { OverviewCoordinationPanel } from "./OverviewCoordinationPanel";
import { WorkspaceSectionCard } from "../WorkspacePrimitives";
import { ITINERARY_STREAM_REGION_ID } from "../itineraryEditorAnchors";

interface DraftPlanMeta {
  source: string;
  sourceLabel: string;
  fallbackUsed: boolean;
}

interface RegenerationControlState {
  dayNumber: number;
  timeBlock: RefinementTimeBlock;
  variant: RefinementVariant;
}

interface OverviewTabProps {
  trip: Trip;
  packingSummary: PackingSummary;
  budgetSummary: BudgetSummary;
  reservationSummary: ReservationSummary;
  activities: TripActivityItem[];
  isStreaming: boolean;
  hasStreamContent: boolean;
  streamError: string | null;
  isAnyGenerating: boolean;
  isRegenerating: boolean;
  isApplying: boolean;
  draftMutationState?: "idle" | "saving" | "saved";
  /** Shown on the draft panel when publish/assist fails (draft mutations only). */
  draftPublishError?: string | null;
  /** Enables compact draft UX (bottom sheet stop edit, larger drag targets). */
  isMobileLayout?: boolean;
  savedItinerary: Itinerary | null;
  pendingItinerary: EditableItinerary | null;
  draftPlanMeta: DraftPlanMeta | null;
  controls: RegenerationControlState | null;
  lockedItemIds: string[];
  favoriteItemIds: string[];
  onStartStream: () => void;
  onCancelStream: () => void;
  onEditSavedAsDraft: () => void;
  onStartManualDraft?: () => void;
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
  onToggleLock: (itemId: string) => void;
  onToggleFavorite: (itemId: string) => void;
  onRegenerateDayChange: (dayNumber: number) => void;
  onRegenerateTimeBlockChange: (timeBlock: RefinementTimeBlock) => void;
  onRegenerateVariantChange: (variant: RefinementVariant) => void;
  onRegenerate: () => void;
  onRunAiAssist?: (request: DraftAiAssistRequest) => void;
  onAddDay: () => void;
  onOpenTab: (
    tab: "overview" | "bookings" | "budget" | "packing" | "members",
  ) => void;
  onOpenActivityDrawer: () => void;
  onItineraryDayToggle: (dayNumber: number, isOpen: boolean) => void;
}

const PillButton = ({
  onClick,
  disabled,
  variant,
  busy,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant: "ocean" | "coral" | "ghost";
  busy?: boolean;
  children: React.ReactNode;
}) => {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35";
  const variants = {
    ocean: "bg-amber text-white hover:bg-amber-dark shadow-sm shadow-amber/25",
    coral: "bg-clay text-white hover:bg-clay-dark shadow-sm shadow-clay/20",
    ghost: "bg-parchment text-espresso hover:bg-smoke",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </motion.button>
  );
};

export function OverviewTab({
  trip,
  packingSummary,
  budgetSummary,
  reservationSummary,
  activities,
  isStreaming,
  hasStreamContent,
  streamError,
  isAnyGenerating,
  isRegenerating,
  isApplying,
  draftMutationState = "idle",
  draftPublishError,
  isMobileLayout = false,
  savedItinerary,
  pendingItinerary,
  draftPlanMeta,
  controls,
  lockedItemIds,
  favoriteItemIds,
  onStartStream,
  onCancelStream,
  onEditSavedAsDraft,
  onStartManualDraft,
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
  onToggleLock,
  onToggleFavorite,
  onRegenerateDayChange,
  onRegenerateTimeBlockChange,
  onRegenerateVariantChange,
  onRegenerate,
  onRunAiAssist,
  onAddDay,
  onOpenTab,
  onOpenActivityDrawer,
  onItineraryDayToggle,
}: OverviewTabProps) {
  const autoDraftSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (isStreaming || pendingItinerary || !savedItinerary) return;

    const signature = `${trip.id}:${savedItinerary.title}:${savedItinerary.days
      .map((day) => `${day.day_number}-${day.date ?? ""}-${day.items.length}`)
      .join("|")}`;

    if (autoDraftSignatureRef.current === signature) return;
    autoDraftSignatureRef.current = signature;
    onEditSavedAsDraft();
  }, [
    isStreaming,
    pendingItinerary,
    savedItinerary,
    trip.id,
    onEditSavedAsDraft,
  ]);

  useEffect(() => {
    if (!savedItinerary) {
      autoDraftSignatureRef.current = null;
    }
  }, [savedItinerary]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section
        aria-label="Trip itinerary"
        className="order-2 min-w-0 space-y-4 lg:order-1"
      >
        <div
          id={ITINERARY_STREAM_REGION_ID}
          className="space-y-3 scroll-mt-4"
        >
        <AnimatePresence>
          {streamError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              role="alert"
            >
              {streamError}
            </motion.div>
          )}
        </AnimatePresence>

        {isStreaming && (
          <div className="space-y-3 rounded-2xl border border-amber/20 bg-amber/5 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber">
                <div className="h-4 w-4 rounded-full border-2 border-amber border-t-transparent animate-spin" />
                Optional AI assist running…
              </div>
              <button
                type="button"
                onClick={onCancelStream}
                className="min-h-10 rounded-full px-3 text-xs font-semibold text-flint transition-colors hover:bg-white/60 hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-[#6B5E52]">
              {hasStreamContent
                ? "Suggestions are streaming in—you stay in control of what lands in the group's draft."
                : "Connecting to the assist layer. You can cancel anytime and keep editing manually."}
            </p>
          </div>
        )}
        </div>

        {!isStreaming && !pendingItinerary ? (
          <WorkspaceSectionCard
            eyebrow="Shared itinerary"
            title={
              savedItinerary
                ? "Continue shaping the live plan"
                : "Start the group's working itinerary"
            }
            description={
              savedItinerary
                ? "Edits here are the draft your group sees. Manual changes stay first; use AI only when you want a nudge."
                : "Build days and stops by hand so the trip has a real source of truth—then optionally ask AI for ideas."
            }
          >
            <div className="flex flex-wrap gap-2">
              {onStartManualDraft && (
                <PillButton
                  variant="ocean"
                  onClick={onStartManualDraft}
                  disabled={isAnyGenerating}
                >
                  Start manual draft
                </PillButton>
              )}
              <PillButton
                variant={onStartManualDraft ? "ghost" : "ocean"}
                onClick={onStartStream}
                disabled={isAnyGenerating}
              >
                AI suggestions (optional)
              </PillButton>
              {savedItinerary && (
                <PillButton variant="ghost" onClick={onEditSavedAsDraft}>
                  Open from saved
                </PillButton>
              )}
            </div>
            <p className="mt-3 text-[11px] text-[#8A7E74]">
              Assistive AI can be wrong or stale—your group confirms dates,
              routes, and prices before anyone travels.
            </p>
          </WorkspaceSectionCard>
        ) : null}

        {!isStreaming && pendingItinerary ? (
          <div className="space-y-3">
            <EditableItineraryPanel
              itinerary={pendingItinerary}
              isMobileLayout={isMobileLayout}
              draftSourceLabel={draftPlanMeta?.sourceLabel ?? null}
              draftFallbackUsed={draftPlanMeta?.fallbackUsed ?? null}
              onApply={onApply}
              applying={isApplying}
              draftMutationState={draftMutationState}
              publishError={draftPublishError}
              regenerating={isRegenerating}
              lockedItemIds={lockedItemIds}
              favoriteItemIds={favoriteItemIds}
              regenerateDayNumber={
                controls?.dayNumber ?? pendingItinerary.days[0]?.day_number ?? 1
              }
              regenerateTimeBlock={controls?.timeBlock ?? "full_day"}
              regenerateVariant={controls?.variant ?? "more_local"}
              onMoveItem={onMoveItem}
              onUpdateDay={onUpdateDay}
              onAddStop={onAddStop}
              onUpdateStop={onUpdateStop}
              onDeleteStop={onDeleteStop}
              onDuplicateStop={onDuplicateStop}
              onReorderStopWithinDay={onReorderStopWithinDay}
              onDuplicateDay={onDuplicateDay}
              onClearDay={onClearDay}
              onDayToggle={onItineraryDayToggle}
              onToggleLock={onToggleLock}
              onToggleFavorite={onToggleFavorite}
              onRegenerateDayChange={(dayNumber) =>
                onRegenerateDayChange(dayNumber)
              }
              onRegenerateTimeBlockChange={(timeBlock) =>
                onRegenerateTimeBlockChange(timeBlock)
              }
              onRegenerateVariantChange={(variant) =>
                onRegenerateVariantChange(variant)
              }
              onRegenerate={() => onRegenerate()}
              onRunAiAssist={onRunAiAssist}
              onAddDay={onAddDay}
            />
          </div>
        ) : !savedItinerary && !pendingItinerary && !isStreaming ? (
          <div className="rounded-3xl border border-dashed border-smoke bg-parchment/40 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-espresso">
              No shared itinerary yet
            </p>
            <p className="mt-1 text-sm text-flint">
              Start with a manual draft the group can edit together, then add AI
              suggestions if they help—nothing here is placeholder data.
            </p>
          </div>
        ) : null}
      </section>

      <div className="order-1 min-w-0 lg:order-2">
        <OverviewCoordinationPanel
          trip={trip}
          packingSummary={packingSummary}
          budgetSummary={budgetSummary}
          reservationSummary={reservationSummary}
          currentItinerary={pendingItinerary ?? savedItinerary}
          activities={activities}
          onOpenTab={onOpenTab}
          onOpenActivityDrawer={onOpenActivityDrawer}
        />
      </div>
    </div>
  );
}

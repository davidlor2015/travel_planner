// Path: ui/src/features/trips/itinerary/components/EditableItineraryDayCard.tsx
// Summary: Renders the EditableItineraryDayCard UI component.

import type { ReactNode } from "react";

export interface EditableItineraryDayCardProps {
  dayNumber: number;
  dayTitle: string;
  formattedDate: string;
  /** e.g. "4 stops · 9:00 to 6:00" */
  metaLine: string;
  dayCostDisplay?: string | null;
  dayCostCoverageLabel?: string | null;
  anchorSummary?: string | null;
  advisoryHint?: string | null;
  readinessHint?: string | null;
  onToggleEditDetails: () => void;
  editingDetails: boolean;
  dayDetailsSummary: ReactNode;
  dayDetailsForm: ReactNode | null;
  /** Timeline, add-stop row, drop zone — non-empty days */
  children: ReactNode;
  /** Empty day: replaces children area */
  emptyState: ReactNode | null;
  moreMenu: ReactNode;
}

export function EditableItineraryDayCard({
  dayNumber,
  dayTitle,
  formattedDate,
  metaLine,
  dayCostDisplay,
  dayCostCoverageLabel,
  anchorSummary,
  advisoryHint,
  readinessHint,
  onToggleEditDetails,
  editingDetails,
  dayDetailsSummary,
  dayDetailsForm,
  children,
  emptyState,
  moreMenu,
}: EditableItineraryDayCardProps) {
  return (
    <section
      className="rounded-2xl border border-smoke/50 bg-[#FEFCF9] px-4 py-5 shadow-[0_1px_0_0_rgba(28,17,8,0.04)] sm:px-5"
      aria-labelledby={`day-heading-${dayNumber}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-espresso text-xs font-bold text-ivory"
              aria-hidden
            >
              {dayNumber}
            </span>
            <div className="min-w-0">
              <h3
                id={`day-heading-${dayNumber}`}
                className="font-display text-base font-semibold leading-tight text-espresso"
              >
                {dayTitle}
              </h3>
              <p className="mt-0.5 text-[13px] text-flint">{formattedDate}</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-flint/95">{metaLine}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {dayCostDisplay ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-olive/30 bg-olive/10 px-1.5 py-0.5 text-[10px] font-semibold text-olive/95">
                <span>{dayCostDisplay}</span>
                {dayCostCoverageLabel ? (
                  <span className="text-[9px] font-medium text-olive/85">
                    ({dayCostCoverageLabel})
                  </span>
                ) : null}
              </span>
            ) : null}
            {anchorSummary ? (
              <span className="inline-flex rounded-md border border-smoke/70 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-flint/95">
                {anchorSummary}
              </span>
            ) : null}
            {advisoryHint ? (
              <span className="inline-flex rounded-md border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                {advisoryHint}
              </span>
            ) : null}
            {readinessHint ? (
              <span className="inline-flex rounded-md border border-danger/25 bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                {readinessHint}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,20rem)]">
          <button
            type="button"
            onClick={onToggleEditDetails}
            aria-expanded={editingDetails}
            className="inline-flex min-h-9 items-center rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-medium text-flint transition-colors hover:bg-parchment hover:text-espresso"
          >
            {editingDetails ? "Close details" : "Day details"}
          </button>
          {moreMenu}
        </div>
      </div>

      {dayDetailsSummary}

      {dayDetailsForm}

      <div className="mt-5">
        {emptyState ? (
          emptyState
        ) : (
          <div className="relative">{children}</div>
        )}
      </div>
    </section>
  );
}

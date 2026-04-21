import type { ReactNode } from "react";

export interface EditableItineraryDayCardProps {
  dayNumber: number;
  dayTitle: string;
  formattedDate: string;
  /** e.g. "4 stops · 9:00 to 6:00" */
  metaLine: string;
  onAssistThisDay: () => void;
  assistDisabled?: boolean;
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
  onAssistThisDay,
  assistDisabled,
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
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,20rem)]">
          <button
            type="button"
            onClick={onAssistThisDay}
            disabled={assistDisabled}
            className="inline-flex min-h-9 items-center rounded-full border border-amber/35 bg-amber/10 px-3 text-[12px] font-semibold text-espresso transition-colors hover:bg-amber/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Assist this day
          </button>
          <button
            type="button"
            onClick={onToggleEditDetails}
            aria-expanded={editingDetails}
            className="inline-flex min-h-9 items-center rounded-full border border-smoke/80 bg-white px-3 text-[12px] font-semibold text-flint hover:bg-parchment"
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

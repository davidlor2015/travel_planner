import { useId, useState } from "react";

export interface ItineraryDraftHeaderProps {
  title: string;
  summary: string;
  /** From itinerary / draft meta — e.g. "Manual draft", "AI enhancement" */
  sourceLabel: string;
  fallbackUsed: boolean;
  tripCostSummary?: string | null;
  tripCostDetail?: string | null;
  onAddDay: () => void;
  onOpenGlobalAiAssist: () => void;
  globalAiDisabled?: boolean;
}

export function ItineraryDraftHeader({
  title,
  summary,
  sourceLabel,
  fallbackUsed,
  tripCostSummary,
  tripCostDetail,
  onAddDay,
  onOpenGlobalAiAssist,
  globalAiDisabled,
}: ItineraryDraftHeaderProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutId = useId();

  return (
    <div className="border-b border-smoke/60 px-5 pt-6 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-lg font-semibold leading-tight text-espresso">
              {title}
            </h4>
            <span className="inline-flex shrink-0 items-center rounded-md border border-smoke/80 bg-parchment/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flint">
              Draft
            </span>
            <span
              className="inline-flex shrink-0 items-center rounded-md border border-espresso/10 bg-espresso/[0.06] px-2 py-0.5 text-[10px] font-medium text-espresso"
              title="How this draft was created"
            >
              {sourceLabel}
            </span>
            {fallbackUsed ? (
              <span className="inline-flex shrink-0 items-center rounded-md border border-amber/25 bg-amber/10 px-2 py-0.5 text-[10px] font-semibold text-amber">
                Fallback
              </span>
            ) : null}
          </div>
          {summary?.trim() ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-flint">
              {summary}
            </p>
          ) : null}
          {tripCostSummary ? (
            <p className="mt-2 text-[12px] font-semibold text-olive/90">
              Estimated trip cost {tripCostSummary}
              {tripCostDetail ? (
                <span className="ml-1 font-normal text-flint/90">
                  ({tripCostDetail})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddDay}
          className="inline-flex min-h-10 items-center rounded-full border border-smoke bg-parchment px-4 text-sm font-semibold text-espresso transition-colors hover:bg-smoke/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/30"
        >
          Add day
        </button>
        <button
          type="button"
          onClick={onOpenGlobalAiAssist}
          disabled={globalAiDisabled}
          className="inline-flex min-h-10 items-center rounded-full border border-smoke bg-white px-4 text-sm font-medium text-flint transition-colors hover:bg-parchment hover:text-espresso disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/30"
        >
          Assist ideas
        </button>
      </div>

      <button
        type="button"
        id={aboutId}
        aria-expanded={aboutOpen}
        aria-controls={`${aboutId}-panel`}
        onClick={() => setAboutOpen((o) => !o)}
        className="mt-3 text-[11px] font-medium text-flint hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/35"
      >
        {aboutOpen ? "Hide details" : "About this draft"}
      </button>
      {aboutOpen ? (
        <div
          id={`${aboutId}-panel`}
          role="region"
          aria-labelledby={aboutId}
          className="mt-2 rounded-lg border border-smoke/50 bg-parchment/30 px-3 py-2.5 text-[11px] leading-relaxed text-flint"
        >
          Edits are yours. Assists only shape this draft — save when the plan
          is the one you want to keep.
        </div>
      ) : null}
    </div>
  );
}

import type { TripActionCommand, TripWorkspaceActionItem } from "./deriveTripActionItems";
import type { AttentionSeverity } from "./tripOverviewViewModel";

function severityBarClass(severity: AttentionSeverity): string {
  if (severity === "blocker") {
    return "border-l-[3px] border-danger bg-danger/[0.06]";
  }
  if (severity === "watch") {
    return "border-l-[3px] border-amber bg-amber/[0.06]";
  }
  return "border-l-[3px] border-[#D2B49A] bg-[#FAF8F5]";
}

interface TripActionBannerProps {
  items: TripWorkspaceActionItem[];
  onCommand: (command: TripActionCommand) => void;
}

export function TripActionBanner({ items, onCommand }: TripActionBannerProps) {
  if (items.length === 0) {
    return (
      <div
        className="mb-3 rounded-lg border border-[#EDE7DD] bg-[#FAF8F5]/80 px-3 py-2.5 text-[11px] leading-snug text-[#8A7E72]"
        role="status"
        aria-live="polite"
      >
        No blockers from current trip data. Keep editing when the plan changes.
      </div>
    );
  }

  return (
    <section
      className="mb-3 overflow-hidden rounded-xl border border-[#EDE7DD] bg-[#FEFCF9]/95"
      aria-label="What needs attention"
    >
      <div className="border-b border-[#EDE7DD]/90 bg-[#FAF8F5]/70 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
          Next up
        </p>
      </div>
      <ul className="divide-y divide-[#EDE7DD]/90">
        {items.map((item) => (
          <li key={item.id}>
            <div className={`px-3 py-2.5 ${severityBarClass(item.severity)}`}>
              <p className="text-[12px] font-semibold leading-snug text-[#1C1108]">
                {item.title}
              </p>
              {item.detail ? (
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5E52]">
                  {item.detail}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onCommand(item.command)}
                className="mt-2 text-left text-[11px] font-semibold text-[#B86845] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
              >
                {item.actionLabel}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

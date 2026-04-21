import type { WorkspaceActivityStripItem } from "./workspaceActivityModel";

interface WorkspaceActivityStripProps {
  hasUnseenChanges: boolean;
  items: WorkspaceActivityStripItem[];
  onOpenActivityDrawer?: () => void;
}

export function WorkspaceActivityStrip({
  hasUnseenChanges,
  items,
  onOpenActivityDrawer,
}: WorkspaceActivityStripProps) {
  return (
    <div className="border-b border-[#EAE2D6] bg-[#FAF8F5] px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
          Change awareness
        </span>
        {hasUnseenChanges ? (
          <span className="inline-flex rounded-full border border-[#E5DDD1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#9A5230]">
            New since last seen
          </span>
        ) : (
          <span className="text-[11px] text-[#8A7E74]">
            No new changes since your last check.
          </span>
        )}
        {onOpenActivityDrawer ? (
          <button
            type="button"
            onClick={onOpenActivityDrawer}
            className="ml-auto min-h-8 rounded-full border border-[#E5DDD1] bg-white px-3 text-[11px] font-semibold text-[#6B5E52] hover:bg-[#F3EEE7]"
          >
            Open details
          </button>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.id}
              className="inline-flex rounded-full border border-[#E5DDD1] bg-white px-2.5 py-1 text-[11px] text-[#6B5E52]"
              title={item.detail}
            >
              {item.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

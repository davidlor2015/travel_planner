import { useEffect, useMemo, useRef } from "react";

import type { TimelineRowVM } from "./types";
import { TimelineRow } from "./TimelineRow";

export function DayTimeline({ rows }: { rows: TimelineRowVM[] }) {
  const containerRef = useRef<HTMLUListElement | null>(null);

  const currentKey = useMemo(() => {
    const now = rows.find((row) => row.variant === "now");
    return now?.stop.key ?? null;
  }, [rows]);

  useEffect(() => {
    if (!currentKey) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-stop-key="${CSS.escape(currentKey)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentKey]);

  return (
    <div>
      {/* Section header: "Today" + stop count */}
      <div className="flex items-baseline justify-between px-6 sm:px-8 lg:px-0">
        <h3 className="font-display text-[22px] font-medium text-[#2a1d13]">
          Today
        </h3>
        {rows.length > 0 ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#8a7866]">
            {rows.length} {rows.length === 1 ? "stop" : "stops"}
          </span>
        ) : null}
      </div>

      {/* Flat timeline list */}
      <ul
        ref={containerRef}
        className="list-none p-0 pl-6 sm:pl-8 lg:pl-0"
        style={{ margin: 0, marginTop: "1rem" }}
      >
        {rows.map((row, index) => (
          <TimelineRow
            key={row.stop.key}
            row={row}
            isLast={index === rows.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

// Path: ui/src/features/trips/workspace/tabs/PackingTab.tsx
// Summary: Implements PackingTab module logic.

import { PackingList } from "../../logistics/packing";
import type { PackingSummary } from "../types";

interface PackingTabProps {
  token: string;
  tripId: number;
  onPackingSummaryChange: (summary: PackingSummary) => void;
}

export function PackingTab({
  token,
  tripId,
  onPackingSummaryChange,
}: PackingTabProps) {
  return (
    <div className="space-y-3">
      <PackingList
        token={token}
        tripId={tripId}
        onSummaryChange={onPackingSummaryChange}
      />
    </div>
  );
}

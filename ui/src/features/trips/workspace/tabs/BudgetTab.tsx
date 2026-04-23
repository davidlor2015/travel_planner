import { BudgetTracker } from "../../logistics/budget";
import type { BudgetSummary } from "../types";

interface BudgetTabProps {
  token: string;
  tripId: number;
  onSummaryChange: (summary: BudgetSummary) => void;
}

export function BudgetTab({ token, tripId, onSummaryChange }: BudgetTabProps) {
  return (
    <div className="space-y-3">
      <BudgetTracker
        token={token}
        tripId={tripId}
        onSummaryChange={onSummaryChange}
      />
    </div>
  );
}

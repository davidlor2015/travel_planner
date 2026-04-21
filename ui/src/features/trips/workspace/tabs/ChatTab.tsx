import type { DayPlan } from "../../../../shared/api/ai";
import type { TripMember } from "../../../../shared/api/trips";
import { TripChatPanel } from "../../TripChat/TripChatPanel";
import type { WorkspaceTab } from "../WorkspaceTabBar";

interface ChatTabProps {
  token: string;
  tripId: number;
  tripTitle: string;
  tripDateLabel: string;
  members: TripMember[];
  currentUserEmail: string;
  itineraryDays: DayPlan[] | null;
  onOpenContextTab: (
    tab: Extract<WorkspaceTab, "overview" | "bookings">,
  ) => void;
}

export function ChatTab({
  token,
  tripId,
  tripTitle,
  tripDateLabel,
  members,
  currentUserEmail,
  itineraryDays,
  onOpenContextTab,
}: ChatTabProps) {
  return (
    <div className="space-y-3">
      <TripChatPanel
        token={token}
        tripId={tripId}
        tripTitle={tripTitle}
        tripDateLabel={tripDateLabel}
        members={members}
        currentUserEmail={currentUserEmail}
        itineraryDays={itineraryDays}
        onOpenContextTab={onOpenContextTab}
      />
    </div>
  );
}

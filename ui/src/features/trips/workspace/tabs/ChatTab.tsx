import type { DayPlan } from "../../../../shared/api/ai";
import type { TripMember } from "../../../../shared/api/trips";
import { TripChatPanel } from "../../logistics/chat/TripChatPanel";
import type { WorkspaceTab } from "../WorkspaceTabBar";

interface ChatTabProps {
  token: string;
  tripId: number;
  tripTitle: string;
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
        members={members}
        currentUserEmail={currentUserEmail}
        itineraryDays={itineraryDays}
        onOpenContextTab={onOpenContextTab}
      />
    </div>
  );
}

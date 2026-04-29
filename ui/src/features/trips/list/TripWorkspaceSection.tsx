// Path: ui/src/features/trips/list/TripWorkspaceSection.tsx
// Summary: Implements TripWorkspaceSection module logic.

import type { Trip } from "../../../shared/api/trips";
import { TripHero } from "../workspace/TripHero";
import { WorkspaceActivityStrip } from "../workspace/WorkspaceActivityStrip";
import {
  WorkspaceTabBar,
  type WorkspaceTab,
} from "../workspace/WorkspaceTabBar";
import type {
  BudgetSummary,
  PackingSummary,
  ReservationSummary,
} from "../workspace/types";
import type { TripReadinessSnapshot } from "../workspace/models/tripOverviewViewModel";
import type { WorkspaceActivityStripItem } from "../workspace/models/workspaceActivityModel";

/**
 * Layout / composition only: hero + tab chrome + scroll region for tab panels.
 * Do not add fetching, mutations, draft transforms, or readiness derivation here —
 * parents own orchestration; this component only arranges UI slots.
 */
export interface TripWorkspaceSectionProps {
  trip: Trip;
  packingSummary: PackingSummary;
  budgetSummary: BudgetSummary;
  reservationSummary: ReservationSummary;
  durationDays: number;
  timelineLabel: string;
  readiness: TripReadinessSnapshot;
  summariesLoaded: boolean;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  bookingsBadge: number;
  groupBadge: number;
  hasItinerary: boolean;
  showChat: boolean;
  activityUnreadCount?: number;
  isActivityMuted?: boolean;
  onManageGroup: () => void;
  onOpenActivityDrawer?: () => void;
  activityStripItems?: WorkspaceActivityStripItem[];
  activityHasUnseenChanges?: boolean;
  onShareTrip?: () => void;
  /** Tab panel content (errors, confirm UI, active tab body). */
  children: React.ReactNode;
}

export function TripWorkspaceSection({
  trip,
  packingSummary,
  budgetSummary,
  reservationSummary,
  durationDays,
  timelineLabel,
  readiness,
  summariesLoaded,
  activeTab,
  onTabChange,
  bookingsBadge,
  groupBadge,
  hasItinerary,
  showChat,
  activityUnreadCount,
  isActivityMuted,
  onManageGroup,
  onOpenActivityDrawer,
  activityStripItems = [],
  activityHasUnseenChanges = false,
  onShareTrip,
  children,
}: TripWorkspaceSectionProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_18px_55px_rgba(28,17,8,0.08)]">
      <TripHero
        trip={trip}
        packingSummary={packingSummary}
        budgetSummary={budgetSummary}
        reservationSummary={reservationSummary}
        durationDays={durationDays}
        timelineLabel={timelineLabel}
        readiness={readiness}
        summariesLoaded={summariesLoaded}
        activityUnreadCount={activityUnreadCount}
        isActivityMuted={isActivityMuted}
        onManageGroup={onManageGroup}
        onOpenActivityDrawer={onOpenActivityDrawer}
        onShareTrip={onShareTrip}
      />

      <WorkspaceActivityStrip
        hasUnseenChanges={activityHasUnseenChanges}
        items={activityStripItems}
        onOpenActivityDrawer={onOpenActivityDrawer}
      />

      <WorkspaceTabBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        bookingsBadge={bookingsBadge}
        groupBadge={groupBadge}
        hasItinerary={hasItinerary}
        showChat={showChat}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={[
            "mx-auto w-full px-4 py-5 pb-8 sm:px-8",
            "max-w-[1180px]",
          ].join(" ")}
          id={`trip-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`trip-tab-${activeTab}`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

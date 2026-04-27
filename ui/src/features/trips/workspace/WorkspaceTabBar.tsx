// Path: ui/src/features/trips/workspace/WorkspaceTabBar.tsx
// Summary: Implements WorkspaceTabBar module logic.

import { useRef, type KeyboardEvent } from "react";

export type WorkspaceTab =
  | "overview"
  | "bookings"
  | "budget"
  | "packing"
  | "members"
  | "map"
  | "chat";

interface TabDef {
  id: WorkspaceTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: <Icon path="M4 5h16M4 12h16M4 19h10" /> },
  { id: "bookings", label: "Bookings", icon: <Icon path="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v1.2a2.3 2.3 0 0 0 0 4.6v1.2A2.5 2.5 0 0 1 16.5 16h-9A2.5 2.5 0 0 1 5 13.5v-1.2a2.3 2.3 0 0 0 0-4.6V6.5Z" /> },
  { id: "budget", label: "Budget", icon: <Icon path="M4 7h16v10H4zM15 12h2" /> },
  { id: "packing", label: "Packing", icon: <Icon path="M8 7V5a4 4 0 0 1 8 0v2M6 7h12l-1 12H7L6 7Z" /> },
  { id: "members", label: "Members", icon: <Icon path="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21a6 6 0 0 1 12 0M17 8a3 3 0 0 1 0 6M18 21a5 5 0 0 0-2-4" /> },
  { id: "map", label: "Map", icon: <Icon path="M12 21s6-5.3 6-11a6 6 0 0 0-12 0c0 5.7 6 11 6 11ZM12 10.5h.01" /> },
  { id: "chat", label: "Chat", icon: <Icon path="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-4l-5 4v-4.2A4 4 0 0 1 3 10V6" /> },
];

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

interface WorkspaceTabBarProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  bookingsBadge: number;
  groupBadge: number;
  hasItinerary: boolean;
  showChat?: boolean;
}

export function WorkspaceTabBar({
  activeTab,
  onTabChange,
  bookingsBadge,
  groupBadge,
  hasItinerary,
  showChat = false,
}: WorkspaceTabBarProps) {
  // Before there is a saved itinerary, hide the support tabs entirely so the
  // user has exactly one place to go: the itinerary. They come back after the
  // first save. Overview + Members + Map + (optional) Chat still show so the
  // user can still see the trip shell and invite collaborators.
  const supportIds = new Set<WorkspaceTab>(["bookings", "budget", "packing"]);
  const baseTabs = hasItinerary
    ? TABS
    : TABS.filter((t) => !supportIds.has(t.id));
  const visibleTabs = showChat ? baseTabs : baseTabs.filter((t) => t.id !== "chat");
  const tabRefs = useRef<Partial<Record<WorkspaceTab, HTMLButtonElement | null>>>({});

  const badges: Partial<Record<WorkspaceTab, number>> = {
    bookings: bookingsBadge,
    members: groupBadge,
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: WorkspaceTab) => {
    const currentIndex = visibleTabs.findIndex((t) => t.id === currentTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % visibleTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = visibleTabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const target = visibleTabs[nextIndex]?.id;
    if (!target) return;
    onTabChange(target);
    tabRefs.current[target]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Trip workspace sections"
      className="flex gap-5 overflow-x-auto border-b border-[#EAE2D6] bg-[#FEFCF9] px-4 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const badge = badges[tab.id] ?? 0;

        return (
          <button
            key={tab.id}
            id={`trip-tab-${tab.id}`}
            role="tab"
            type="button"
            ref={(node) => { tabRefs.current[tab.id] = node; }}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            aria-selected={isActive}
            aria-controls={`trip-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={[
              "relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap px-0 py-4 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35",
              isActive
                ? "font-semibold text-[#1C1108] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[#B86845] after:content-['']"
                : "font-medium text-[#8A7E74] hover:text-[#1C1108]",
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
            {badge > 0 && (
              // Neutral counts, not alert badges. The support tabs are
              // quietly informative — a red pill reads as "something is wrong"
              // when it really means "there are N items here".
              <span
                className={[
                  "flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums",
                  isActive
                    ? "bg-[#1C1108]/10 text-[#1C1108]"
                    : "bg-[#EAE2D6] text-[#6B5E52]",
                ].join(" ")}
                aria-label={`${badge} ${badge === 1 ? "item" : "items"}`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Path: ui/src/features/trips/logistics/activity/TripActivityDrawer.tsx
// Summary: Implements TripActivityDrawer module logic.

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { Trip } from "../../../../shared/api/trips";
import type { TripActivityItem } from "./types";

interface TripActivityDrawerProps {
  isOpen: boolean;
  isMobile: boolean;
  trip: Trip | null;
  activities: TripActivityItem[];
  unreadIds: Set<string>;
  activeFilter: "all" | "unread";
  mutedTripIds: number[];
  onClose: () => void;
  onFilterChange: (next: "all" | "unread") => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onOpenPreferences: () => void;
  showPreferences: boolean;
  onToggleCurrentTripMute: () => void;
  onUnmuteTrip: (tripId: number) => void;
  allTrips: Trip[];
}

function toTimeLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TripActivityDrawer({
  isOpen,
  isMobile,
  trip,
  activities,
  unreadIds,
  activeFilter,
  mutedTripIds,
  onClose,
  onFilterChange,
  onMarkAllRead,
  onMarkRead,
  onOpenPreferences,
  showPreferences,
  onToggleCurrentTripMute,
  onUnmuteTrip,
  allTrips,
}: TripActivityDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const mutedTrips = useMemo(
    () => allTrips.filter((candidate) => mutedTripIds.includes(candidate.id)),
    [allTrips, mutedTripIds],
  );

  const currentTripMuted = trip ? mutedTripIds.includes(trip.id) : false;
  const unreadCount = activities.filter((activity) =>
    unreadIds.has(activity.id),
  ).length;

  const filteredActivities =
    activeFilter === "unread"
      ? activities.filter((activity) => unreadIds.has(activity.id))
      : activities;

  const panelMotion = isMobile
    ? {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
      }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close trip activity drawer"
            onClick={onClose}
            className="absolute inset-0 bg-[#1C1108]/30 backdrop-blur-[1px]"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Trip activity updates"
            {...panelMotion}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={[
              "absolute z-10 flex max-h-full flex-col border-[#E5DDD1] bg-[#FEFCF9] shadow-[0_14px_38px_rgba(28,17,8,0.18)]",
              isMobile
                ? "inset-x-0 bottom-0 h-[88dvh] rounded-t-[24px] border-t px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-4"
                : "inset-y-0 right-0 w-[420px] border-l px-5 pb-5 pt-5",
            ].join(" ")}
          >
            <header className="border-b border-[#EAE2D6] pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
                    Trip activity
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#1C1108]">
                    {trip?.title ?? "Trip updates"}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#6B5E52]">
                    Unread: {unreadCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E5DDD1] px-3 text-[12px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7]"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-[#E5DDD1] bg-[#FAF8F5] p-1">
                  <button
                    type="button"
                    onClick={() => onFilterChange("all")}
                    className={[
                      "min-h-9 rounded-full px-3 text-[12px] font-semibold transition-colors",
                      activeFilter === "all"
                        ? "bg-white text-[#1C1108] shadow-sm"
                        : "text-[#8A7E74] hover:text-[#1C1108]",
                    ].join(" ")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterChange("unread")}
                    className={[
                      "min-h-9 rounded-full px-3 text-[12px] font-semibold transition-colors",
                      activeFilter === "unread"
                        ? "bg-white text-[#1C1108] shadow-sm"
                        : "text-[#8A7E74] hover:text-[#1C1108]",
                    ].join(" ")}
                  >
                    Unread
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onMarkAllRead}
                  disabled={unreadCount === 0}
                  className="min-h-9 rounded-full border border-[#E5DDD1] px-3 text-[12px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Mark seen
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto pt-3">
              {currentTripMuted ? (
                <div className="mb-3 rounded-xl border border-[#EADCC7] bg-[#FBF5E8] px-3 py-2 text-[12px] text-[#6B5E52]">
                  Updates are currently muted for this trip.
                </div>
              ) : null}

              {filteredActivities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#DCCDBD] bg-[#FAF8F5] px-4 py-4 text-sm text-[#6B5E52]">
                  {activeFilter === "unread"
                    ? "You are all caught up."
                    : "No activity yet. Updates will appear as trip changes happen."}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredActivities.map((activity) => {
                    const isUnread = unreadIds.has(activity.id);
                    return (
                      <li
                        key={activity.id}
                        className="rounded-xl border border-[#EAE2D6] bg-white px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-[#1C1108]">
                              {activity.title}
                            </p>
                            <p className="mt-1 text-[12px] text-[#6B5E52]">
                              {activity.detail}
                            </p>
                          </div>
                          {isUnread ? (
                            <span className="inline-flex items-center rounded-full border border-[#E5DDD1] bg-[#F5EDE7] px-2 py-0.5 text-[10px] font-semibold text-[#9A5230]">
                              Unread
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#8A7E74]">
                              Read
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#8A7E74]">
                              {activity.tripLabel}
                            </span>
                            <span className="rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#8A7E74]">
                              {activity.unreadHint}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#8A7E74]">
                              {toTimeLabel(activity.occurredAt)}
                            </span>
                            {isUnread ? (
                              <button
                                type="button"
                                onClick={() => onMarkRead(activity.id)}
                                className="min-h-8 rounded-full border border-[#E5DDD1] px-2.5 text-[11px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7]"
                              >
                                Mark seen
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="border-t border-[#EAE2D6] pt-3">
              <button
                type="button"
                onClick={onOpenPreferences}
                className="inline-flex min-h-10 items-center rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-3 text-[12px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7]"
              >
                Notification preferences
              </button>

              {showPreferences ? (
                <div className="mt-3 space-y-2 rounded-xl border border-[#EAE2D6] bg-white px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[#1C1108]">
                      Current trip
                    </p>
                    <button
                      type="button"
                      onClick={onToggleCurrentTripMute}
                      disabled={!trip}
                      className="min-h-9 rounded-full border border-[#E5DDD1] px-3 text-[11px] font-semibold text-[#6B5E52] transition-colors hover:bg-[#F3EEE7] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {currentTripMuted ? "Unmute" : "Mute"} updates
                    </button>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-[#1C1108]">
                      Muted trips
                    </p>
                    {mutedTrips.length === 0 ? (
                      <p className="mt-1 text-[11px] text-[#8A7E74]">
                        None muted.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1.5">
                        {mutedTrips.map((mutedTrip) => (
                          <li
                            key={mutedTrip.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-[#EAE2D6] bg-[#FAF8F5] px-2.5 py-2"
                          >
                            <span className="text-[11px] font-medium text-[#1C1108]">
                              {mutedTrip.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUnmuteTrip(mutedTrip.id)}
                              className="min-h-8 rounded-full border border-[#E5DDD1] px-2.5 text-[10.5px] font-semibold text-[#6B5E52] transition-colors hover:bg-white"
                            >
                              Unmute
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </footer>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

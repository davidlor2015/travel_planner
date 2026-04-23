import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { Trip } from "../../../shared/api/trips";
import { getTripImageUrl } from "../workspace/helpers/tripVisuals";
import { getTripStatus } from "../workspace/helpers/tripDateUtils";
import { PlusIcon } from "./tripListIcons";

export interface TripPickerBarProps {
  trips: Trip[];
  selectedTripId: number | null;
  onTripChange: (id: number) => void;
  onCreateClick: () => void;
  /**
   * Optional contextual action slot rendered at the left of the
   * right-hand cluster (before the primary action). Used to host
   * ephemeral indicators like "Return to On-Trip" without taking a new row.
   */
  leadingAction?: ReactNode;
}

export function TripPickerBar({
  trips,
  selectedTripId,
  onTripChange,
  onCreateClick,
  leadingAction,
}: TripPickerBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? trips[0];

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  if (!selectedTrip) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#EAE2D6] bg-[#FEFCF9] px-3 py-2 transition-colors hover:bg-[#F5EDE7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
        >
          <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-md border border-[#DDD5C8]">
            <img
              src={getTripImageUrl(selectedTrip)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <span className="max-w-[200px] truncate font-display text-[14px] font-semibold text-[#1C1108]">
            {selectedTrip.title}
          </span>
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5 flex-shrink-0 text-[#B0A498]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: pickerOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] shadow-[0_12px_40px_rgba(28,17,8,0.12)]"
            >
              <div className="max-h-72 space-y-0.5 overflow-y-auto p-2">
                {trips.map((trip) => {
                  const status = getTripStatus(trip.start_date, trip.end_date);
                  const isActive = trip.id === selectedTripId;
                  const dotColor =
                    status === "active"
                      ? "#4ADE80"
                      : status === "upcoming"
                        ? "#FCD34D"
                        : "#B0A498";
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => {
                        onTripChange(trip.id);
                        setPickerOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#F5EDE7]"
                      style={{
                        backgroundColor: isActive ? "#F0E8DF" : undefined,
                      }}
                    >
                      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-[#DDD5C8]">
                        <img
                          src={getTripImageUrl(trip)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-[13px] font-semibold text-[#1C1108]">
                            {trip.title}
                          </span>
                          <span
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        </div>
                        <span className="block truncate text-[11px] text-[#8A7E74]">
                          {trip.destination}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        {leadingAction}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateClick}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1C1108] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#2E2216] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
        >
          <PlusIcon size={13} strokeWidth={2.3} />
          <span className="hidden min-[380px]:inline">New Trip</span>
        </motion.button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import type { DayPlan } from "../../../shared/api/ai";
import {
  getReservations,
  type Reservation,
} from "../../../shared/api/reservations";
import type { TripMember } from "../../../shared/api/trips";
import { track } from "../../../shared/analytics";
import type { WorkspaceTab } from "../workspace/WorkspaceTabBar";
import { localTripChatAdapter } from "./tripChatAdapter";
import type { TripChatMessage, TripChatReference } from "./types";

interface TripChatPanelProps {
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

interface ReferenceOption {
  value: string;
  label: string;
  reference: TripChatReference;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local
    .split(/[._-]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (parts.length === 0) return email;

  return parts.map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function toInitials(email: string): string {
  const name = toDisplayName(email);
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase() || "W";
}

function formatMessageTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAvatarTone(index: number): string {
  const tones = [
    "#B86845",
    "#6A7A43",
    "#4D6B8A",
    "#7A5A8B",
    "#C89A3C",
    "#A39688",
  ];
  return tones[index % tones.length] ?? tones[0];
}

export function TripChatPanel({
  token,
  tripId,
  tripTitle,
  tripDateLabel: _tripDateLabel,
  members,
  currentUserEmail,
  itineraryDays,
  onOpenContextTab,
}: TripChatPanelProps) {
  const [messages, setMessages] = useState<TripChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [reservationRows, setReservationRows] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  const [selectedReference, setSelectedReference] =
    useState<TripChatReference | null>(null);
  const [selectedItineraryOption, setSelectedItineraryOption] = useState("");
  const [selectedBookingOption, setSelectedBookingOption] = useState("");
  const [showRefPicker, setShowRefPicker] = useState(false);
  const refPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;
    setLoadingMessages(true);
    setMessageError(null);

    void localTripChatAdapter
      .listMessages(tripId)
      .then((rows) => {
        if (!isActive) return;
        setMessages(rows);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const nextMessage =
          error instanceof Error
            ? error.message
            : "Could not load this thread right now.";
        setMessageError(nextMessage);
      })
      .finally(() => {
        if (!isActive) return;
        setLoadingMessages(false);
      });

    track({
      name: "trip_chat_opened",
      props: {
        trip_id: tripId,
        member_count: members.length,
      },
    });

    return () => {
      isActive = false;
    };
  }, [members.length, tripId]);

  useEffect(() => {
    let isActive = true;
    setIsLoadingReservations(true);

    void getReservations(token, tripId)
      .then((rows) => {
        if (!isActive) return;
        setReservationRows(rows);
      })
      .catch(() => {
        if (!isActive) return;
        setReservationRows([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingReservations(false);
      });

    return () => {
      isActive = false;
    };
  }, [token, tripId]);

  const itineraryReferenceOptions = useMemo<ReferenceOption[]>(() => {
    if (!itineraryDays || itineraryDays.length === 0) return [];

    const options: ReferenceOption[] = [];
    for (const day of itineraryDays) {
      day.items.forEach((item, index) => {
        const label = `Day ${day.day_number} -> ${item.title}`;
        options.push({
          value: `itinerary-${day.day_number}-${index}`,
          label,
          reference: {
            kind: "itinerary",
            label,
            tab: "overview",
            targetId: `day-${day.day_number}-item-${index}`,
          },
        });
      });
    }

    return options;
  }, [itineraryDays]);

  const bookingReferenceOptions = useMemo<ReferenceOption[]>(() => {
    return reservationRows.map((reservation) => {
      const label = `Booking -> ${reservation.title}`;
      return {
        value: `booking-${reservation.id}`,
        label,
        reference: {
          kind: "booking",
          label,
          tab: "bookings",
          targetId: `booking-${reservation.id}`,
        },
      };
    });
  }, [reservationRows]);

  const memberLookup = useMemo(() => {
    return new Map(
      members.map((member) => [normalizeEmail(member.email), member]),
    );
  }, [members]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showRefPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        refPickerRef.current &&
        !refPickerRef.current.contains(e.target as Node)
      ) {
        setShowRefPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showRefPicker]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setMessageError(null);
    try {
      const sent = await localTripChatAdapter.sendMessage({
        tripId,
        authorEmail: currentUserEmail,
        body,
        reference: selectedReference ?? undefined,
      });

      setMessages((prev) => [...prev, sent]);
      setDraft("");
      setSelectedReference(null);
      setSelectedItineraryOption("");
      setSelectedBookingOption("");
      setShowRefPicker(false);

      track({
        name: "trip_chat_message_sent",
        props: {
          trip_id: tripId,
          message_length: body.length,
          has_reference: Boolean(sent.reference),
          reference_kind: sent.reference?.kind ?? null,
        },
      });
    } catch (error) {
      setMessageError(
        error instanceof Error
          ? error.message
          : "Could not send your message right now.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleItineraryReferenceSelect = (value: string) => {
    setSelectedItineraryOption(value);
    const picked =
      itineraryReferenceOptions.find((option) => option.value === value) ??
      null;
    setSelectedReference(picked?.reference ?? null);
    setSelectedBookingOption("");

    if (picked) {
      track({
        name: "trip_chat_reference_added",
        props: {
          trip_id: tripId,
          reference_kind: picked.reference.kind,
        },
      });
    }
  };

  const handleBookingReferenceSelect = (value: string) => {
    setSelectedBookingOption(value);
    const picked =
      bookingReferenceOptions.find((option) => option.value === value) ?? null;
    setSelectedReference(picked?.reference ?? null);
    setSelectedItineraryOption("");

    if (picked) {
      track({
        name: "trip_chat_reference_added",
        props: {
          trip_id: tripId,
          reference_kind: picked.reference.kind,
        },
      });
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9]"
      style={{ height: "520px" }}
    >
      {/* Header */}
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid #F0EBE4" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(184,104,69,0.08)", color: "#B86845" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-[14px] font-semibold text-[#1C1108]">
              {tripTitle}
            </p>
            <p className="text-[11px] text-[#A39688]">
              {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          {members.slice(0, 4).map((member, i) => (
            <div
              key={`${member.user_id}-${member.email}`}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#FEFCF9] text-[8px] font-semibold text-white"
              style={{
                backgroundColor: getAvatarTone(i),
                zIndex: 10 - i,
              }}
              title={member.email}
            >
              {toInitials(member.email)}
            </div>
          ))}
        </div>
      </div>

      {/* Message feed */}
      <div
        role="log"
        aria-label="Trip chat messages"
        className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
      >
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[#EAE2D6]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#C8BEB2]">
            Today
          </span>
          <div className="h-px flex-1 bg-[#EAE2D6]" />
        </div>

        {loadingMessages ? (
          <p className="text-sm text-[#8A7E74]">Loading thread…</p>
        ) : null}

        {!loadingMessages && messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DCCDBD] bg-[#FEFCF9] px-4 py-3 text-[13px] text-[#6B5E52]">
            Share the next booking update, route change, or day-plan decision
            with the group.
          </div>
        ) : null}

        {messages.map((message, idx) => {
          const isMe =
            normalizeEmail(message.authorEmail) ===
            normalizeEmail(currentUserEmail);
          const member = memberLookup.get(normalizeEmail(message.authorEmail));
          const authorLabel = isMe
            ? "You"
            : toDisplayName(member?.email ?? message.authorEmail);
          const memberIndex = members.findIndex(
            (m) =>
              normalizeEmail(m.email) === normalizeEmail(message.authorEmail),
          );
          const senderColor = getAvatarTone(memberIndex >= 0 ? memberIndex : idx);
          const msgRef = message.reference;

          return (
            <motion.div
              key={message.id}
              data-testid="trip-chat-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}
            >
              {!isMe && (
                <div
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold text-white"
                  style={{ backgroundColor: senderColor }}
                >
                  {toInitials(member?.email ?? message.authorEmail)}
                </div>
              )}
              <div
                className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!isMe && (
                  <span
                    className="mb-0.5 text-[11px] font-semibold"
                    style={{ color: senderColor }}
                  >
                    {authorLabel}
                  </span>
                )}
                <div
                  className="rounded-2xl px-4 py-2.5"
                  style={{
                    backgroundColor: isMe ? "#1C1108" : "#F5F1EB",
                    borderBottomRightRadius: isMe ? "6px" : "18px",
                    borderBottomLeftRadius: isMe ? "18px" : "6px",
                  }}
                >
                  <p
                    className="whitespace-pre-wrap text-[13px] leading-[1.5]"
                    style={{ color: isMe ? "#FEFCF9" : "#1C1108" }}
                  >
                    {message.body}
                  </p>
                </div>
                {msgRef ? (
                  <button
                    type="button"
                    data-testid="trip-chat-reference"
                    onClick={() => {
                      onOpenContextTab(msgRef.tab);
                      track({
                        name: "trip_chat_reference_opened",
                        props: {
                          trip_id: tripId,
                          reference_kind: msgRef.kind,
                          target_tab: msgRef.tab,
                        },
                      });
                    }}
                    className="mt-1 text-[11px] font-semibold text-[#B86845] transition-colors hover:text-[#9A5230]"
                  >
                    → {msgRef.label}
                  </button>
                ) : null}
                <span className="mt-0.5 text-[10px] text-[#C8BEB2]">
                  {formatMessageTimestamp(message.createdAt)}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reference chip */}
      {selectedReference ? (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-[#E4D7C8] bg-[#F8F2EA] px-3 py-1.5">
          <span className="flex-1 truncate text-[12px] font-medium text-[#7B4C32]">
            → {selectedReference.label}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedReference(null);
              setSelectedItineraryOption("");
              setSelectedBookingOption("");
            }}
            className="text-[13px] font-semibold text-[#7B4C32] transition-colors hover:text-[#B86845]"
          >
            ×
          </button>
        </div>
      ) : null}

      {messageError ? (
        <p
          className="mx-4 mb-2 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[12px] text-danger"
          role="alert"
        >
          {messageError}
        </p>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        aria-label="Trip chat composer"
        className="flex flex-shrink-0 items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid #F0EBE4", backgroundColor: "#FAF8F5" }}
      >
        {/* Reference picker */}
        <div ref={refPickerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowRefPicker((prev) => !prev)}
            aria-label="Attach reference"
            className={[
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              showRefPicker || selectedReference
                ? "bg-[#F5EDE7] text-[#B86845]"
                : "text-[#B0A498] hover:bg-[#F0EBE4] hover:text-[#B86845]",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>

          {showRefPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-[#EAE2D6] bg-white p-3 shadow-[0_8px_24px_rgba(28,17,8,0.1)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
                Link itinerary
              </p>
              <select
                value={selectedItineraryOption}
                onChange={(e) => handleItineraryReferenceSelect(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5DDD1] bg-[#FEFCF9] px-3 py-2 text-[12px] text-[#1C1108] outline-none"
              >
                <option value="">No itinerary reference</option>
                {itineraryReferenceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">
                Link booking
              </p>
              <select
                value={selectedBookingOption}
                onChange={(e) => handleBookingReferenceSelect(e.target.value)}
                disabled={isLoadingReservations}
                className="mt-1 w-full rounded-lg border border-[#E5DDD1] bg-[#FEFCF9] px-3 py-2 text-[12px] text-[#1C1108] outline-none disabled:opacity-60"
              >
                <option value="">
                  {isLoadingReservations ? "Loading…" : "No booking reference"}
                </option>
                {bookingReferenceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <input
          id={`chat-message-${tripId}`}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-[#E5DDD1] bg-[#F0EBE4] px-4 py-2.5 text-[13px] text-[#1C1108] outline-none placeholder:text-[#B0A498] focus:border-[#CDAE95] focus:ring-2 focus:ring-[#B86845]/15"
        />

        <motion.button
          type="submit"
          disabled={isSending || !draft.trim()}
          whileHover={draft.trim() ? { scale: 1.05 } : undefined}
          whileTap={draft.trim() ? { scale: 0.95 } : undefined}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed"
          style={{
            backgroundColor: draft.trim() ? "#B86845" : "#D8CFC6",
            color: "#FEFCF9",
          }}
          aria-label="Send message"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22 11 13 2 9l20-7z" />
          </svg>
        </motion.button>
      </form>
    </div>
  );
}

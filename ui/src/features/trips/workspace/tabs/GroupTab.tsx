import { useState } from "react";
import type { Trip } from "../../../../shared/api/trips";
import { track } from "../../../../shared/analytics";
import { MemberAvatarStack } from "../WorkspacePrimitives";

interface GroupTabProps {
  trip: Trip;
  isOwner: boolean;
  memberDraft: string;
  memberError: string | null;
  memberFeedback: string | null;
  isAddingMember: boolean;
  onDraftChange: (value: string) => void;
  onAddMember: () => void;
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
  const label = toDisplayName(email);
  const parts = label.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase() || "W";
}

function formatRoleLabel(role: string): string {
  if (role.toLowerCase() === "owner") return "Trip owner";
  if (role.toLowerCase() === "editor") return "Co-planner";
  return "Companion";
}


function InviteFeedback({
  feedback,
  tripId,
}: {
  feedback: string;
  tripId: number;
}) {
  const [copied, setCopied] = useState(false);

  const urlMatch = feedback.match(/(https?:\/\/\S+)/);
  const inviteUrl = urlMatch?.[1] ?? null;

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        track({
          name: "trip_invite_link_copied",
          props: { source: "members_tab", trip_id: tripId },
        });
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <div className="mt-2 rounded-2xl border border-olive/20 bg-olive/10 px-3 py-3 text-sm text-olive">
      <p className="font-semibold">Invite created</p>
      {inviteUrl ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="break-all flex-1 rounded-lg border border-smoke bg-white px-2 py-1.5 text-xs font-mono text-flint">
            {inviteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-full border border-olive/30 bg-white px-3 py-1.5 text-xs font-semibold text-olive transition-colors hover:bg-olive/10 cursor-pointer"
            aria-label="Copy invite link"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="mt-1 break-all text-xs text-flint">{feedback}</p>
      )}
    </div>
  );
}

export function GroupTab({
  trip,
  isOwner,
  memberDraft,
  memberError,
  memberFeedback,
  isAddingMember,
  onDraftChange,
  onAddMember,
}: GroupTabProps) {
  const joinedCount = trip.members.length;
  const pendingCount = trip.pending_invites.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Members</p>
            <h3 className="mt-1 text-[15px] font-semibold text-[#1C1108]">Travel companions</h3>
          </div>
          <MemberAvatarStack members={trip.members} size="sm" showLabel={false} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E5DDD1] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">Joined</p>
            <p className="mt-1 font-display text-[22px] font-semibold leading-none text-[#1C1108]">
              {joinedCount}
              <span className="ml-1 font-sans text-[13px] font-normal text-[#8A7E74]">
                companion{joinedCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-[#E5DDD1] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">Pending</p>
            <p className="mt-1 font-display text-[22px] font-semibold leading-none text-[#1C1108]">
              {pendingCount}
              <span className="ml-1 font-sans text-[13px] font-normal text-[#8A7E74]">
                invite{pendingCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {isOwner ? (
        <div className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Invite</p>
          <h3 className="mt-1 text-[15px] font-semibold text-[#1C1108]">Invite by email</h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#B86845]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FEFCF9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 7L2 7" />
              </svg>
            </div>
            <label htmlFor="group-invite-email" className="sr-only">Invite companion by email</label>
            <input
              id="group-invite-email"
              type="email"
              value={memberDraft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  track({ name: "trip_invite_submission_requested", props: { trip_id: trip.id, source: "members_tab_enter" } });
                  onAddMember();
                }
              }}
              placeholder="traveler@example.com"
              className="min-h-10 flex-1 rounded-xl border border-[#E5DDD1] bg-[#F5F1EB] px-3 py-2 text-[13px] text-[#1C1108] placeholder:text-[#A39688] focus:outline-none focus:ring-2 focus:ring-[#B86845]/25"
            />
            <button
              type="button"
              onClick={() => {
                track({ name: "trip_invite_submission_requested", props: { trip_id: trip.id, source: "members_tab_button" } });
                onAddMember();
              }}
              disabled={!memberDraft.trim() || isAddingMember}
              className="rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: '#1C1108' }}
            >
              {isAddingMember ? "Sending…" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#8A7E74]">
            Joined members share itinerary, bookings, map, and notes. Budget and packing remain personal.
          </p>
          {memberError ? <p className="mt-2 text-sm text-danger" role="alert">{memberError}</p> : null}
          {memberFeedback ? <InviteFeedback feedback={memberFeedback} tripId={trip.id} /> : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Invite</p>
          <p className="mt-1 text-[13px] text-[#6B5E52]">Invites are handled by the trip owner. Ask them to send a join link if another companion should be added.</p>
        </div>
      )}

      <div className="rounded-2xl border border-[#EAE2D6] bg-[#FEFCF9] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A39688]">Companions</p>
        <h3 className="mt-1 text-[15px] font-semibold text-[#1C1108]">Who is in this trip</h3>
        <div className="mt-4 space-y-2">
          {trip.members.map((member, index) => {
            const COLORS = ["#B86845","#6A7A43","#4D6B8A","#7A5A8B","#C89A3C","#A39688"];
            const roleBadge = member.role === "owner"
              ? { bg: "#FBF5E8", border: "#EDD9A3", text: "#9A6A20" }
              : member.role === "editor"
                ? { bg: "#EDF0F5", border: "#B0C4D8", text: "#3D5C7A" }
                : { bg: "#EEF3E8", border: "#B8D09A", text: "#4A6A28" };
            return (
              <article
                key={`${trip.id}-${member.user_id}`}
                className="flex items-center gap-4 rounded-xl border border-[#EAE2D6] bg-white px-5 py-3.5"
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold text-white"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden="true"
                >
                  {toInitials(member.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[#1C1108]">
                    {toDisplayName(member.email)}
                  </p>
                  <p className="truncate text-[11px] text-[#A39688]">{member.email}</p>
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: roleBadge.bg, border: `1px solid ${roleBadge.border}`, color: roleBadge.text }}
                >
                  {formatRoleLabel(member.role)}
                </div>
              </article>
            );
          })}

          {trip.pending_invites.map((invite, index) => (
            <article
              key={`${trip.id}-invite-${invite.id}`}
              className="flex items-center gap-4 rounded-xl border border-[#EADCC7] bg-[#FBF5E8] px-5 py-3.5"
            >
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0E3D1] text-[12px] font-semibold text-[#9A6A20]"
                aria-hidden="true"
              >
                {toInitials(invite.email || `invite-${index + 1}`)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-[#1C1108]">
                  {toDisplayName(invite.email)}
                </p>
                <p className="truncate text-[11px] text-[#A39688]">{invite.email}</p>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: "#FBF5E8", border: "1px solid #EDD9A3", color: "#9A6A20" }}
              >
                Pending
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

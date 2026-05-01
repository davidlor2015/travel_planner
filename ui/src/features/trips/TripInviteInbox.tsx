// Path: ui/src/features/trips/TripInviteInbox.tsx
// Summary: Renders the authenticated user's pending trip invite inbox.

import type { PendingTripInvite } from '../../shared/api/trips';

type ActionState = {
  inviteId: number;
  action: 'accept' | 'decline';
} | null;

interface TripInviteInboxProps {
  invites: PendingTripInvite[];
  loading: boolean;
  error: string | null;
  actionState: ActionState;
  onAccept: (inviteId: number) => void;
  onDecline: (inviteId: number) => void;
  onRetry: () => void;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  return `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
}

export function TripInviteInbox({
  invites,
  loading,
  error,
  actionState,
  onAccept,
  onDecline,
  onRetry,
}: TripInviteInboxProps) {
  return (
    <section className="rounded-2xl border border-border bg-bg-app p-4 shadow-[0_8px_30px_rgba(28,17,8,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Invites</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-espresso">Trip invitations</h2>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-sunken"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-muted px-4 py-5 text-sm text-text-muted">
          Checking for pending trip invites…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm font-semibold text-accent"
          >
            Try again
          </button>
        </div>
      ) : invites.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-muted px-4 py-5 text-sm text-text-muted">
          No pending trip invites.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {invites.map((invite) => {
            const inviter =
              invite.invited_by_display_name?.trim() ||
              invite.invited_by_email ||
              'A trip owner';
            const dateRange = formatDateRange(invite.start_date, invite.end_date);
            const accepting =
              actionState?.inviteId === invite.id && actionState.action === 'accept';
            const declining =
              actionState?.inviteId === invite.id && actionState.action === 'decline';

            return (
              <article
                key={invite.id}
                className="rounded-2xl border border-border bg-surface px-4 py-4"
              >
                <p className="text-sm font-semibold text-espresso">
                  You&apos;ve been invited to {invite.trip_title}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {inviter} invited {invite.invitee_email}.
                </p>
                <p className="mt-2 text-xs text-text-soft">
                  {invite.destination}
                  {dateRange ? ` · ${dateRange}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAccept(invite.id)}
                    disabled={Boolean(actionState)}
                    className="rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-espresso-dark disabled:opacity-50"
                  >
                    {accepting ? 'Accepting…' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecline(invite.id)}
                    disabled={Boolean(actionState)}
                    className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-sunken disabled:opacity-50"
                  >
                    {declining ? 'Declining…' : 'Decline'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

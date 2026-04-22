import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { acceptTripInvite, getTripInviteDetail, type TripInviteDetail } from '../../shared/api/trips';
import type { UserProfile } from '../../shared/api/auth';
import { track } from '../../shared/analytics';
import { WaypointLogo } from '../../shared/ui/WaypointLogo';

interface TripInvitePageProps {
  token: string | null;
  user: UserProfile | null;
}

export const TripInvitePage = ({ token, user }: TripInvitePageProps) => {
  const { inviteToken = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [invite, setInvite] = useState<TripInviteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      try {
        const detail = await getTripInviteDetail(inviteToken);
        if (!cancelled) {
          setInvite(detail);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invite.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptTripInvite(token, inviteToken);
      setAccepted(true);
      track({
        name: 'trip_invite_accepted',
        props: {
          trip_id: result.trip_id,
          invite_status: result.status,
        },
      });
      navigate(`/app/trips/${result.trip_id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="min-h-screen relative overflow-hidden bg-ivory flex items-center justify-center p-6 font-sans">
      <div className="pointer-events-none absolute -top-32 -left-24 w-[500px] h-[500px] rounded-full bg-clay/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-[420px] h-[420px] rounded-full bg-amber/8 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.5 }}
        className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-xl border border-smoke/60 p-8"
      >
        <div className="text-center mb-7">
          <WaypointLogo variant="mark" className="mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-espresso font-display">Trip invitation</h1>
          <p className="text-sm text-flint mt-1.5">
            Review the invite details before joining the shared trip workspace.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-smoke bg-parchment/70 px-4 py-6 text-center text-sm text-flint">
            Loading invite…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-5 text-sm text-danger">
            {error}
          </div>
        ) : invite ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-smoke bg-parchment/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Trip</p>
              <p className="mt-1 text-lg font-bold text-espresso">{invite.trip_title}</p>
              <p className="mt-1 text-sm text-flint">{invite.destination}</p>
              <p className="mt-3 text-sm text-flint">
                {new Date(invite.start_date).toLocaleDateString()} to {new Date(invite.end_date).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Invite status</p>
              <p className="mt-1 text-sm text-espresso">
                {invite.status === 'pending' ? 'Pending acceptance' : invite.status}
              </p>
              <p className="mt-2 text-sm text-flint">This invite is for {invite.email}.</p>
              {invite.invited_by_email ? (
                <p className="mt-1 text-sm text-flint">
                  Invited by <span className="font-semibold text-espresso">{invite.invited_by_email}</span>.
                </p>
              ) : null}
              {invite.expires_at ? (
                <p className="mt-1 text-sm text-flint">
                  {(() => {
                    const expiresAtMs = new Date(invite.expires_at).getTime();
                    const hasExpired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
                    const label = new Date(invite.expires_at).toLocaleString();
                    return hasExpired
                      ? `Expired on ${label}.`
                      : `Expires on ${label}.`;
                  })()}
                </p>
              ) : null}
            </div>

            {invite.status !== 'pending' ? (
              <div className="rounded-2xl border border-smoke bg-parchment/70 px-4 py-4 text-sm text-flint">
                This invite is no longer pending. Sign in to review your trips.
              </div>
            ) : !token || !user ? (
              <div className="space-y-3 rounded-2xl border border-smoke bg-parchment/70 px-4 py-4">
                <p className="text-sm text-flint">
                  Sign in or create an account with <span className="font-semibold text-espresso">{invite.email}</span> to accept this invite.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/login?returnTo=${returnTo}`}
                    className="inline-flex rounded-full bg-amber px-4 py-2 text-sm font-semibold text-white hover:bg-amber-dark transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to={`/register?returnTo=${returnTo}`}
                    className="inline-flex rounded-full bg-parchment px-4 py-2 text-sm font-semibold text-espresso hover:bg-smoke transition-colors"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                You&apos;re signed in as {user.email}, but this invite is for {invite.email}. Switch accounts to accept it.
              </div>
            ) : accepted ? (
              <div className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-4 text-sm text-olive">
                Invite accepted. Redirecting to the trip…
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-full bg-amber text-white font-bold text-sm shadow-lg shadow-amber/25 hover:bg-amber-dark transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {accepting ? 'Joining trip…' : 'Accept invite'}
              </button>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

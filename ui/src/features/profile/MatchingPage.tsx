import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { TravelProfileForm } from './TravelProfileForm';
import { MatchRequestList } from './MatchRequestList';
import { useMatchingProfile } from './useMatchingProfile';
import { useMatchRequests } from './useMatchRequests';
import type { Trip } from '../../shared/api/trips';
import { buildProfileCompleteness, formatMatchingLabel } from './matchingInsights';


interface MatchingPageProps {
  token: string;
  trips: Trip[];
}

export const MatchingPage = ({ token, trips }: MatchingPageProps) => {
  const { profile, loading, error, upsert } = useMatchingProfile(token);
  const { requests, loading: requestsLoading, error: requestsError } = useMatchRequests(token);
  const [editing, setEditing] = useState(false);

  const completeness = useMemo(
    () => (profile ? buildProfileCompleteness(profile) : null),
    [profile],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-espresso">Matching</h2>
          <p className="text-sm text-flint mt-1">
            Loading your traveler profile and discovery view.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-smoke/60 shadow-sm p-6 space-y-4 animate-pulse">
          <div className="h-6 w-40 rounded-full bg-parchment" />
          <div className="h-4 w-2/3 rounded-full bg-smoke/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl border border-smoke bg-parchment/50 px-4 py-5">
                <div className="h-3 w-20 rounded-full bg-smoke/60" />
                <div className="mt-3 h-5 w-28 rounded-full bg-parchment" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-espresso">Find compatible travelers</h2>
          <p className="text-sm text-flint mt-1">
            Browse how companion matching works first. Set up your profile only when you want to open a request and start comparing fit.
          </p>
        </div>

        <div className="rounded-2xl border border-smoke bg-parchment/50 p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">1. Choose a trip</p>
              <p className="mt-2 text-sm text-flint">Matching stays anchored to a real trip with destination and dates already set.</p>
            </div>
            <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">2. Compare fit</p>
              <p className="mt-2 text-sm text-flint">We look at travel style, budget, interests, group size, and timing overlap.</p>
            </div>
            <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">3. Decide later</p>
              <p className="mt-2 text-sm text-flint">You can browse the workflow first, then save a profile when you are ready to participate.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
            <p className="text-sm font-semibold text-espresso">What matching includes in v1</p>
            <p className="mt-1 text-sm text-flint">
              Matching is intentionally narrow: discoverability, trip overlap, compatibility signals, and request-based browsing. It is not a full social wall.
            </p>
          </div>
        </div>

        <div className="flex gap-3 max-sm:flex-col">
          <motion.button
            type="button"
            onClick={() => setEditing((value) => !value)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-3 rounded-full bg-amber text-white text-sm font-bold shadow-sm shadow-amber/25 hover:bg-amber-dark transition-colors duration-150 cursor-pointer"
          >
            {editing ? 'Hide Profile Setup' : 'Set Up Matching Profile'}
          </motion.button>
        </div>

        {error ? (
          <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
            {error}
          </div>
        ) : null}

        {editing ? (
          <TravelProfileForm token={token} onSubmitProfile={upsert} onSuccess={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : null}
      </div>
    );
  }

 

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-espresso">Matching</h2>
          <p className="text-sm text-flint mt-1">
            Your profile is ready. Browse requests and open one when you want to start seeing compatible travelers.
          </p>
        </div>

        <motion.button
          type="button"
          onClick={() => setEditing((value) => !value)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-4 py-2 rounded-full bg-amber text-white text-sm font-bold shadow-sm shadow-amber/25
                     hover:bg-amber-dark transition-colors duration-150 cursor-pointer"
        >
          {editing ? 'Close Editor' : 'Edit Profile'}
        </motion.button>
      </div>

      {error ? (
        <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm font-medium">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-smoke bg-parchment/50 px-4 py-4 text-sm text-flint">
        <p className="font-semibold text-espresso">Limited matching scope</p>
        <p className="mt-1">
          Companion matching is intentionally narrow right now. It stays focused on destination overlap, date overlap, discoverability, and profile compatibility so the core trip workflow remains the product center.
        </p>
      </div>

      {editing ? (
        <TravelProfileForm
          token={token}
          profile={profile}
          onSubmitProfile={upsert}
          onSuccess={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : completeness ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.22, duration: 0.42 }}
          className="bg-white rounded-2xl border border-smoke/60 shadow-sm p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-bold text-espresso">Your matching profile</h3>
              <p className="text-sm text-flint mt-1">
                These preferences are used to score and rank potential travel matches.
              </p>
            </div>

            <span
              className={[
                'px-3 py-1.5 rounded-full border text-xs font-bold',
                profile.is_discoverable
                  ? 'bg-olive/10 text-olive border-olive/20'
                  : 'bg-parchment text-flint border-smoke',
              ].join(' ')}
            >
              {profile.is_discoverable ? 'Discoverable' : 'Hidden'}
            </span>
          </div>

          <div className="rounded-2xl border border-smoke bg-parchment/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-flint">Profile quality</p>
                <p className="text-base font-bold text-espresso mt-1">{completeness.score}% complete</p>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-white border border-smoke text-xs font-bold text-flint">
                {completeness.completed}/{completeness.total} signals ready
              </span>
            </div>

            <div className="h-2 rounded-full bg-white border border-smoke overflow-hidden">
              <div className="h-full rounded-full bg-amber" style={{ width: `${completeness.score}%` }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {completeness.checks.map((check) => (
                <div
                  key={check.label}
                  className={[
                    'rounded-xl border px-3 py-2',
                    check.done
                      ? 'bg-olive/10 border-olive/20 text-olive'
                      : 'bg-white border-smoke text-flint',
                  ].join(' ')}
                >
                  {check.label}
                </div>
              ))}
            </div>

            {completeness.prompts.length > 0 && (
              <div className="rounded-xl bg-white border border-smoke px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-flint">Improve your match quality</p>
                <div className="mt-2 space-y-2 text-sm text-flint">
                  {completeness.prompts.map((prompt) => (
                    <p key={prompt}>{prompt}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-parchment border border-smoke px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Travel style</p>
              <p className="text-base font-bold text-espresso mt-1">{formatMatchingLabel(profile.travel_style)}</p>
            </div>

            <div className="rounded-2xl bg-parchment border border-smoke px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Budget</p>
              <p className="text-base font-bold text-espresso mt-1">{formatMatchingLabel(profile.budget_range)}</p>
            </div>

            <div className="rounded-2xl bg-parchment border border-smoke px-4 py-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Interests</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20 text-amber text-sm font-semibold"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-parchment border border-smoke px-4 py-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-flint">Preferred group size</p>
              <p className="text-base font-bold text-espresso mt-1">
                {profile.group_size_min} to {profile.group_size_max} travelers
              </p>
            </div>
          </div>

        </motion.div>
      ) : null}

      {!editing && !requestsLoading && (
        <div className="space-y-4">
          {requestsError ? (
            <div
              role="alert"
              className="px-4 py-4 rounded-2xl bg-danger/10 border border-danger/25 text-sm"
            >
              <p className="font-semibold text-danger">Match requests unavailable</p>
              <p className="mt-1 text-flint">
                {requestsError}
              </p>
            </div>
          ) : null}

          <MatchRequestList token={token} trips={trips} requests={requests} />
        </div>
      )}

      {!editing && requestsLoading && (
        <div className="rounded-2xl border border-smoke/60 bg-white p-5 space-y-3 animate-pulse">
          <div className="h-5 w-32 rounded-full bg-parchment" />
          {[1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-smoke bg-parchment/40 px-4 py-4">
              <div className="h-4 w-28 rounded-full bg-smoke/70" />
              <div className="mt-3 h-3 w-2/3 rounded-full bg-parchment" />
              <div className="mt-3 h-10 rounded-full bg-smoke/50" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

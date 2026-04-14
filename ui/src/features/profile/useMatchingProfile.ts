import { useEffect, useState } from 'react';

import {
  getProfile,
  upsertProfile,
  type TravelProfile,
  type TravelProfilePayload,
} from '../../shared/api/matching';


interface UseMatchingProfileResult {
  profile: TravelProfile | null;
  loading: boolean;
  error: string | null;
  upsert: (data: TravelProfilePayload) => Promise<TravelProfile>;
}


export function useMatchingProfile(token: string | null): UseMatchingProfileResult {
  const [profile, setProfile] = useState<TravelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!token) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
          setError('No access token provided');
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextProfile = await getProfile(token);
        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load matching profile';
          setError(message);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const upsert = async (data: TravelProfilePayload): Promise<TravelProfile> => {
    if (!token) {
      throw new Error('No access token provided');
    }

    setError(null);

    try {
      const nextProfile = await upsertProfile(token, data);
      setProfile(nextProfile);
      return nextProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save matching profile';
      setError(message);
      throw err;
    }
  };

  return { profile, loading, error, upsert };
}

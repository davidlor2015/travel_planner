import { useEffect, useState } from 'react';

import {
  closeRequest as closeMatchRequest,
  getRequests,
  openRequest as openMatchRequest,
  type MatchRequest,
} from '../../shared/api/matching';


interface UseMatchRequestsResult {
  requests: MatchRequest[];
  loading: boolean;
  error: string | null;
  openRequest: (tripId: number) => Promise<MatchRequest>;
  closeRequest: (requestId: number) => Promise<void>;
}


export function useMatchRequests(token: string | null): UseMatchRequestsResult {
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      if (!token) {
        if (!cancelled) {
          setRequests([]);
          setLoading(false);
          setError('No access token provided');
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextRequests = await getRequests(token);
        if (!cancelled) {
          setRequests(nextRequests);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load match requests';
          setError(message);
          setRequests([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const openRequest = async (tripId: number): Promise<MatchRequest> => {
    if (!token) {
      throw new Error('No access token provided');
    }

    setError(null);

    try {
      const response = await openMatchRequest(token, tripId);
      setRequests((current) => [response.request, ...current.filter((item) => item.id !== response.request.id)]);
      return response.request;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open match request';
      setError(message);
      throw err;
    }
  };

  const closeRequest = async (requestId: number): Promise<void> => {
    if (!token) {
      throw new Error('No access token provided');
    }

    setError(null);

    try {
      await closeMatchRequest(token, requestId);
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? { ...request, status: 'closed' } : request,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close match request';
      setError(message);
      throw err;
    }
  };

  return { requests, loading, error, openRequest, closeRequest };
}

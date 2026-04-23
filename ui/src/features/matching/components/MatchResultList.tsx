import { motion, AnimatePresence } from 'framer-motion';

import { useMatchResults } from '../hooks/useMatchResults';
import { MatchResultCard } from './MatchResultCard';


interface MatchResultListProps {
  requestId: number;
  token: string;
}


export const MatchResultList = ({ requestId, token }: MatchResultListProps) => {
  const { results, loading, error } = useMatchResults(token, requestId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-smoke/60 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-5 w-32 rounded-full bg-parchment" />
            <div className="mt-3 h-3 w-24 rounded-full bg-smoke/70" />
            <div className="mt-4 h-4 w-full rounded-full bg-parchment" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-parchment" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="px-4 py-4 rounded-2xl bg-danger/10 border border-danger/25 text-sm"
      >
        <p className="font-semibold text-danger">Matches unavailable</p>
        <p className="mt-1 text-flint">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-5 rounded-2xl bg-parchment border border-smoke text-sm text-flint">
        <p className="font-semibold text-espresso">No matches yet</p>
        <p className="mt-1">
          We have not found a compatible traveler for this request yet. Leave it open and check back after more people add matching profiles and trips.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-3"
    >
      <AnimatePresence initial={false}>
        {results.map((result, index) => (
          <motion.div
            key={`${result.matched_user.id}-${result.matched_trip.id}-${index}`}
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          >
            <MatchResultCard token={token} requestId={requestId} result={result} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

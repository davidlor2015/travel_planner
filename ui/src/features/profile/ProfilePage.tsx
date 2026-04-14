import { motion } from 'framer-motion';
import type { Trip } from '../../shared/api/trips';
import { useProfileStats, type Badge, type TravelStats } from './useProfileStats';



interface ProfilePageProps {
  trips: Trip[];
  userEmail: string;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.25, duration: 0.45 } },
};



interface StatConfig {
  label: string;
  getValue: (s: TravelStats) => number | string;
  accentCls: string;
  icon: React.ReactNode;
}

const PlaneIcon = () => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const STAT_CONFIGS: StatConfig[] = [
  {
    label: 'Total Trips',
    getValue: (s) => s.totalTrips,
    accentCls: 'text-amber bg-amber/10',
    icon: <PlaneIcon />,
  },
  {
    label: 'Destinations',
    getValue: (s) => s.uniqueDestinations.length,
    accentCls: 'text-clay bg-clay/10',
    icon: <PinIcon />,
  },
  {
    label: 'Days Planned',
    getValue: (s) => s.totalDays,
    accentCls: 'text-espresso bg-parchment',
    icon: <CalendarIcon />,
  },
  {
    label: 'Itineraries',
    getValue: (s) => s.tripsWithItinerary,
    accentCls: 'text-olive bg-olive/10',
    icon: <ListIcon />,
  },
];


const StatCard = ({ config, stats }: { config: StatConfig; stats: TravelStats }) => (
  <motion.div
    variants={itemVariants}
    className="bg-white rounded-2xl border border-smoke/60 shadow-sm p-5 flex items-center gap-4"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.accentCls}`}>
      {config.icon}
    </div>
    <div>
      <p className="text-2xl font-extrabold text-espresso leading-none">{config.getValue(stats)}</p>
      <p className="text-xs text-flint mt-1 font-medium">{config.label}</p>
    </div>
  </motion.div>
);

const BadgeCard = ({ badge }: { badge: Badge }) => (
  <motion.div
    variants={itemVariants}
    className={[
      'rounded-2xl border px-4 py-4 flex flex-col gap-1.5 transition-opacity duration-150',
      badge.earned ? badge.earnedCls : `${badge.unearnedCls} opacity-60`,
    ].join(' ')}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-extrabold leading-tight">{badge.name}</span>
      {!badge.earned && (
        <span className="flex-shrink-0 opacity-50">
          <LockIcon />
        </span>
      )}
    </div>
    <p className={`text-xs leading-snug ${badge.earned ? 'opacity-80' : 'text-flint'}`}>
      {badge.description}
    </p>
  </motion.div>
);


export const ProfilePage = ({ trips, userEmail }: ProfilePageProps) => {
  const { stats, badges, title } = useProfileStats(trips);

  const initial       = userEmail[0].toUpperCase();
  const earnedCount   = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-8">

      {/* ── Profile header ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col sm:flex-row items-center sm:items-end gap-5"
      >
        {/* Avatar */}
        <motion.div
          variants={itemVariants}
          className="w-20 h-20 rounded-full bg-espresso flex items-center justify-center shadow-lg shadow-espresso/20 flex-shrink-0"
        >
          <span className="text-3xl font-extrabold text-ivory select-none">{initial}</span>
        </motion.div>

        {/* Identity */}
        <motion.div variants={itemVariants} className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-espresso leading-tight">{userEmail}</h2>
          <p className="text-sm font-semibold text-amber mt-0.5">{title}</p>
          <p className="text-xs text-flint mt-1">
            {earnedCount} of {badges.length} badges earned
          </p>
        </motion.div>
      </motion.div>

      {/* ── Stats grid ── */}
      <section>
        <h3 className="text-base font-bold text-espresso mb-3">Travel Stats</h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {STAT_CONFIGS.map((config) => (
            <StatCard key={config.label} config={config} stats={stats} />
          ))}
        </motion.div>
      </section>

      {/* ── Badges ── */}
      <section>
        <h3 className="text-base font-bold text-espresso mb-3">Badges</h3>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </motion.div>
      </section>

      {/* ── Destinations ── */}
      {stats.uniqueDestinations.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-espresso mb-3">Destinations</h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-wrap gap-2"
          >
            {stats.uniqueDestinations.map((dest) => (
              <motion.span
                key={dest}
                variants={itemVariants}
                className="px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20 text-amber text-sm font-semibold"
              >
                {dest}
              </motion.span>
            ))}
          </motion.div>
        </section>
      )}

      {/* ── Empty state ── */}
      {trips.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-smoke rounded-2xl text-center">
          <h3 className="text-lg font-bold text-espresso">No adventures yet</h3>
          <p className="text-sm text-flint">Create your first trip to start earning badges and stats.</p>
        </div>
      )}

    </div>
  );
};

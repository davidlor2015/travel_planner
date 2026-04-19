import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  createTripInvite,
  deleteTrip,
  getTrips,
  getTripSummaries,
  type Trip,
  type TripSummary,
} from '../../../shared/api/trips';
import {
  AI_REQUEST_TIMEOUT_MS,
  applyItinerary,
  planItinerarySmart,
  refineItinerary,
  type Itinerary,
} from '../../../shared/api/ai';
import { BudgetTracker } from '../BudgetTracker';
import { EditTripModal } from '../EditTripModal';
import { EditableItineraryPanel } from '../EditableItineraryPanel/EditableItineraryPanel';
import { ItineraryMap } from '../ItineraryMap';
import { ItineraryPanel } from '../ItineraryPanel';
import { PackingList } from '../PackingList';
import { PrepPanel } from '../PrepPanel';
import { ReservationsPanel } from '../ReservationsPanel';
import {
  buildItemReferences,
  moveEditableItineraryItem,
  preserveSelectionIds,
  toApiItinerary,
  toEditableItinerary,
  type EditableItinerary,
  type RefinementTimeBlock,
  type RefinementVariant,
} from '../itineraryDraft';
import { track } from '../../../shared/analytics';
import { useStreamingItinerary } from '../../../shared/hooks/useStreamingItinerary';

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

const IconBase = ({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const SearchIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </IconBase>
);

const PlusIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </IconBase>
);

const UsersIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="3.5" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
);

const CalendarIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </IconBase>
);

const PackageIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m16.5 9.4-9-5.19" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </IconBase>
);

const WalletIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    <path d="M3 8h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3" />
    <circle cx="16" cy="12" r="1" />
  </IconBase>
);

const BookOpenIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4H10v16H4.5A2.5 2.5 0 0 0 2 22Z" />
    <path d="M22 6.5A2.5 2.5 0 0 0 19.5 4H14v16h5.5A2.5 2.5 0 0 1 22 22Z" />
  </IconBase>
);

const MapIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </IconBase>
);

const CheckSquareIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="m9 12 2 2 4-4" />
  </IconBase>
);

const GlobeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18" />
    <path d="M12 3a15 15 0 0 0 0 18" />
  </IconBase>
);

const MapPinIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </IconBase>
);

const ShareIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 3.9" />
    <path d="m15.4 6.6-6.8 3.8" />
  </IconBase>
);

const UserIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </IconBase>
);

interface TripListProps {
  token: string;
  currentUserEmail: string;
  onCreateClick: () => void;
  initialTripId?: number;
  onTripSelect?: (tripId: number | null) => void;
  onTripsChange?: React.Dispatch<React.SetStateAction<Trip[]>>;
}

type TripStatus = 'upcoming' | 'active' | 'past';
type WorkspaceTab = 'plan' | 'map' | 'members' | 'bookings' | 'budget' | 'packing' | 'prep';
type WorkspaceGroup = 'shared' | 'personal';

interface PackingSummary {
  total: number;
  checked: number;
  progressPct: number;
  loading: boolean;
}

interface BudgetSummary {
  limit: number | null;
  totalSpent: number;
  remaining: number | null;
  isOverBudget: boolean;
  expenseCount: number;
  loading: boolean;
}

interface DraftPlanMeta {
  source: string;
  sourceLabel: string;
  fallbackUsed: boolean;
}

interface ReservationSummary {
  total: number;
  upcoming: number;
  loading: boolean;
}

interface RegenerationControlState {
  dayNumber: number;
  timeBlock: RefinementTimeBlock;
  variant: RefinementVariant;
}

interface TabMeta {
  id: WorkspaceTab;
  label: string;
  helper: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; cls: string }> = {
  upcoming: { label: 'Upcoming', cls: 'bg-amber/15 text-amber border-amber/30' },
  active: { label: 'Active', cls: 'bg-olive/10 text-olive border-olive/20' },
  past: { label: 'Past', cls: 'bg-parchment text-flint border-smoke' },
};

const SHARED_TABS: TabMeta[] = [
  {
    id: 'plan',
    label: 'Plan',
    helper: 'Shared destination, dates, itinerary, and planning context for everyone on the trip.',
    icon: <BookOpenIcon size={15} strokeWidth={1.9} />,
  },
  {
    id: 'map',
    label: 'Map',
    helper: 'Shared trip map built from the saved itinerary that all members can review.',
    icon: <MapIcon size={15} strokeWidth={1.9} />,
  },
  {
    id: 'members',
    label: 'Members',
    helper: 'Group members, roles, and invitations for the shared side of this trip.',
    icon: <UsersIcon size={15} strokeWidth={1.9} />,
  },
  {
    id: 'bookings',
    label: 'Bookings',
    helper: 'Shared travel reservations and booking details the whole trip can rely on.',
    icon: <CalendarIcon size={15} strokeWidth={1.9} />,
  },
];

const PERSONAL_TABS: TabMeta[] = [
  {
    id: 'budget',
    label: 'My Budget',
    helper: 'Only your personal budget for this trip. Other members do not see or edit it.',
    icon: <WalletIcon size={15} strokeWidth={1.9} />,
  },
  {
    id: 'packing',
    label: 'My Pack List',
    helper: 'Only your personal packing list. It stays private to your account.',
    icon: <PackageIcon size={15} strokeWidth={1.9} />,
  },
  {
    id: 'prep',
    label: 'My Ready',
    helper: 'Only your reminders, checklist items, and readiness state for this trip.',
    icon: <CheckSquareIcon size={15} strokeWidth={1.9} />,
  },
];

const ALL_TABS = [...SHARED_TABS, ...PERSONAL_TABS];

function parseItinerary(description: string): Itinerary | null {
  try {
    return JSON.parse(description);
  } catch {
    const marker = 'DETAILS (JSON): ';
    const idx = description.indexOf(marker);
    if (idx !== -1) {
      try {
        return JSON.parse(description.slice(idx + marker.length));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parsePreferences(notes: string | null): { budget?: string; pace?: string; interests?: string[] } | null {
  if (!notes) return null;
  const result: { budget?: string; pace?: string; interests?: string[] } = {};
  for (const part of notes.split('|').map((value) => value.trim())) {
    const budget = part.match(/^Budget:\s*(.+)$/i);
    if (budget) {
      result.budget = budget[1].trim();
      continue;
    }
    const pace = part.match(/^Pace:\s*(.+)$/i);
    if (pace) {
      result.pace = pace[1].trim();
      continue;
    }
    const interests = part.match(/^Interests:\s*(.+)$/i);
    if (interests) {
      result.interests = interests[1]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function getTripStatus(startIso: string, endIso: string): TripStatus {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'active';
}

function getTripTimelineLabel(startIso: string, endIso: string): string {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const daysUntilStart = Math.ceil((start - now) / 86_400_000);
  const daysUntilEnd = Math.ceil((end - now) / 86_400_000);

  if (daysUntilStart > 1) return `${daysUntilStart} days until departure`;
  if (daysUntilStart === 1) return 'Departs tomorrow';
  if (daysUntilStart === 0) return 'Departs today';
  if (daysUntilEnd >= 0) return 'Currently traveling';
  if (daysUntilEnd === -1) return 'Ended yesterday';
  return `Completed ${Math.abs(daysUntilEnd)} days ago`;
}

function formatTripDateRange(startIso: string, endIso: string, compact = false): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (compact) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' - '
      + end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      + ' - '
      + end.getDate()
      + ', '
      + end.getFullYear();
  }

  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' - '
    + end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTripDurationDays(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function getMemberInitials(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local
    .split(/[._-]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '');
  return initials.toUpperCase();
}

function getTripMonogram(trip: Trip): string {
  const words = `${trip.title} ${trip.destination}`
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase();
}

function getTripAccentClasses(seed: number): { block: string; glow: string } {
  const variants = [
    { block: 'from-amber/90 via-clay/85 to-depth/80', glow: 'bg-amber/25' },
    { block: 'from-clay/90 via-amber/80 to-espresso/85', glow: 'bg-clay/25' },
    { block: 'from-olive/90 via-clay/80 to-espresso/85', glow: 'bg-olive/25' },
    { block: 'from-espresso/90 via-clay/85 to-amber/80', glow: 'bg-espresso/20' },
  ];
  return variants[Math.abs(seed) % variants.length] ?? variants[0];
}

function getAvatarTone(index: number): string {
  const tones = [
    'bg-amber text-white border-amber/20',
    'bg-clay text-white border-clay/20',
    'bg-olive text-white border-olive/20',
    'bg-espresso text-white border-espresso/20',
  ];
  return tones[index % tones.length] ?? tones[0];
}

function packingSnapshotLabel(summary: PackingSummary | undefined): string {
  if (!summary || summary.loading) return 'Loading packing';
  if (summary.total === 0) return 'No packing items yet';
  return `${summary.checked}/${summary.total} packed`;
}

function getDefaultRegenerationControls(itinerary: EditableItinerary): RegenerationControlState {
  return {
    dayNumber: itinerary.days[0]?.day_number ?? 1,
    timeBlock: 'full_day',
    variant: 'more_local',
  };
}

function findTabMeta(tab: WorkspaceTab): TabMeta {
  return ALL_TABS.find((item) => item.id === tab) ?? ALL_TABS[0];
}

function groupForTab(tab: WorkspaceTab): WorkspaceGroup {
  return SHARED_TABS.some((item) => item.id === tab) ? 'shared' : 'personal';
}

const LoadingSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div className="rounded-3xl border border-smoke/60 bg-white p-5 animate-pulse">
      <div className="h-6 w-28 rounded-full bg-smoke" />
      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="rounded-2xl border border-smoke/50 p-4">
            <div className="h-4 w-2/3 rounded-full bg-parchment" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-parchment" />
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-4">
      <div className="rounded-3xl border border-smoke/60 bg-white p-6 animate-pulse">
        <div className="h-5 w-24 rounded-full bg-smoke" />
        <div className="mt-4 h-8 w-1/2 rounded-full bg-parchment" />
        <div className="mt-3 h-4 w-1/3 rounded-full bg-parchment" />
      </div>
      <div className="rounded-3xl border border-smoke/60 bg-white p-6 animate-pulse">
        <div className="h-5 w-40 rounded-full bg-smoke" />
        <div className="mt-4 h-40 rounded-2xl bg-parchment" />
      </div>
    </div>
  </div>
);

interface PillButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'ocean' | 'coral' | 'ghost' | 'danger';
  busy?: boolean;
  children: React.ReactNode;
}

const PillButton = ({ onClick, disabled, variant, busy, children }: PillButtonProps) => {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    ocean: 'bg-amber text-white hover:bg-amber-dark shadow-sm shadow-amber/25',
    coral: 'bg-clay text-white hover:bg-clay-dark shadow-sm shadow-clay/20',
    ghost: 'bg-parchment text-espresso hover:bg-smoke',
    danger: 'border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15',
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </motion.button>
  );
};

interface StreamingDisplayProps {
  text: string;
  onCancel: () => void;
}

const StreamingDisplay = ({ text, onCancel }: StreamingDisplayProps) => (
  <div className="space-y-3 rounded-2xl border border-amber/20 bg-amber/5 px-4 py-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium text-amber">
        <div className="h-4 w-4 rounded-full border-2 border-amber border-t-transparent animate-spin" />
        Generating itinerary...
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-flint hover:text-espresso transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </div>
    {text.length > 0 && (
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-parchment p-3 text-xs leading-relaxed text-flint">
        {text}
      </pre>
    )}
  </div>
);

export const TripList = ({
  token,
  currentUserEmail,
  onCreateClick,
  initialTripId,
  onTripSelect,
  onTripsChange,
}: TripListProps) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('plan');
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [pendingItineraries, setPendingItineraries] = useState<Record<number, EditableItinerary>>({});
  const [draftPlanMeta, setDraftPlanMeta] = useState<Record<number, DraftPlanMeta>>({});
  const [generatingSmartIds, setGeneratingSmartIds] = useState<Set<number>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<number>>(new Set());
  const [viewingIds, setViewingIds] = useState<Set<number>>(new Set());

  const [packingSummaries, setPackingSummaries] = useState<Record<number, PackingSummary>>({});
  const [budgetSummaries, setBudgetSummaries] = useState<Record<number, BudgetSummary>>({});
  const [reservationSummaries, setReservationSummaries] = useState<Record<number, ReservationSummary>>({});

  const [lockedItemIds, setLockedItemIds] = useState<Record<number, string[]>>({});
  const [favoriteItemIds, setFavoriteItemIds] = useState<Record<number, string[]>>({});
  const [regenerationControls, setRegenerationControls] = useState<Record<number, RegenerationControlState>>({});

  const [memberDrafts, setMemberDrafts] = useState<Record<number, string>>({});
  const [memberErrors, setMemberErrors] = useState<Record<number, string | null>>({});
  const [memberFeedback, setMemberFeedback] = useState<Record<number, string | null>>({});
  const [addingMemberIds, setAddingMemberIds] = useState<Set<number>>(new Set());

  const { streams, start: startStream, reset: resetStream } = useStreamingItinerary(token);

  useEffect(() => {
    onTripsChange?.(trips);
  }, [onTripsChange, trips]);

  useEffect(() => {
    const loadTripWorkspaceMeta = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tripRows, summaryRows] = await Promise.all([getTrips(token), getTripSummaries(token)]);
        setTrips(tripRows);
        setPackingSummaries(
          Object.fromEntries(
            summaryRows.map((summary: TripSummary) => [
              summary.trip_id,
              {
                total: summary.packing_total,
                checked: summary.packing_checked,
                progressPct: summary.packing_progress_pct,
                loading: false,
              },
            ]),
          ),
        );
        setBudgetSummaries(
          Object.fromEntries(
            summaryRows.map((summary: TripSummary) => [
              summary.trip_id,
              {
                limit: summary.budget_limit,
                totalSpent: summary.budget_total_spent,
                remaining: summary.budget_remaining,
                isOverBudget: summary.budget_is_over,
                expenseCount: summary.budget_expense_count,
                loading: false,
              },
            ]),
          ),
        );
        setReservationSummaries(
          Object.fromEntries(
            summaryRows.map((summary: TripSummary) => [
              summary.trip_id,
              {
                total: summary.reservation_count,
                upcoming: summary.reservation_upcoming_count,
                loading: false,
              },
            ]),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    void loadTripWorkspaceMeta();
  }, [token]);

  useEffect(() => {
    if (trips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    if (initialTripId && trips.some((trip) => trip.id === initialTripId)) {
      setSelectedTripId(initialTripId);
      return;
    }

    if (selectedTripId && trips.some((trip) => trip.id === selectedTripId)) {
      return;
    }

    setSelectedTripId(trips[0].id);
  }, [initialTripId, selectedTripId, trips]);

  useEffect(() => {
    for (const [tripIdKey, streamState] of Object.entries(streams)) {
      const tripId = Number(tripIdKey);
      const completedItinerary = streamState?.itinerary;
      if (!completedItinerary) continue;

      setPendingItineraries((prev) => {
        if (prev[tripId]) return prev;
        const editable = toEditableItinerary(completedItinerary);
        setDraftPlanMeta((prevMeta) => ({
          ...prevMeta,
          [tripId]: {
            source: completedItinerary.source,
            sourceLabel: completedItinerary.source_label,
            fallbackUsed: completedItinerary.fallback_used,
          },
        }));
        setRegenerationControls((controls) => ({
          ...controls,
          [tripId]: controls[tripId] ?? getDefaultRegenerationControls(editable),
        }));
        return { ...prev, [tripId]: editable };
      });
    }
  }, [streams]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  );

  const selectedTripStatus = selectedTrip ? getTripStatus(selectedTrip.start_date, selectedTrip.end_date) : null;
  const selectedPackingSummary = selectedTrip ? packingSummaries[selectedTrip.id] : undefined;
  const selectedBudgetSummary = selectedTrip ? budgetSummaries[selectedTrip.id] : undefined;
  const selectedReservationSummary = selectedTrip ? reservationSummaries[selectedTrip.id] : undefined;
  const selectedSavedItinerary = selectedTrip?.description ? parseItinerary(selectedTrip.description) : null;
  const selectedPendingItinerary = selectedTrip ? pendingItineraries[selectedTrip.id] ?? null : null;
  const selectedDraftPlanMeta = selectedTrip ? draftPlanMeta[selectedTrip.id] ?? null : null;
  const selectedControls = selectedTrip
    ? regenerationControls[selectedTrip.id] ?? (selectedPendingItinerary ? getDefaultRegenerationControls(selectedPendingItinerary) : null)
    : null;
  const selectedTabMeta = findTabMeta(activeTab);
  const activeGroup = groupForTab(activeTab);
  const filteredTrips = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) =>
      `${trip.title} ${trip.destination}`.toLowerCase().includes(query),
    );
  }, [sidebarQuery, trips]);
  const currentTrips = filteredTrips.filter((trip) => getTripStatus(trip.start_date, trip.end_date) !== 'past');
  const pastTrips = filteredTrips.filter((trip) => getTripStatus(trip.start_date, trip.end_date) === 'past');

  const selectTrip = (tripId: number) => {
    setSelectedTripId(tripId);
    onTripSelect?.(tripId);
    setConfirmDelete(false);
  };

  const toggleSavedPlanView = (tripId: number) => {
    setViewingIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  };

  const upsertDraftItinerary = (tripId: number, itinerary: Itinerary, previous?: EditableItinerary) => {
    const editable = toEditableItinerary(itinerary, previous);
    setPendingItineraries((prev) => ({ ...prev, [tripId]: editable }));
    setDraftPlanMeta((prev) => ({
      ...prev,
      [tripId]: {
        source: itinerary.source,
        sourceLabel: itinerary.source_label,
        fallbackUsed: itinerary.fallback_used,
      },
    }));
    setRegenerationControls((prev) => ({
      ...prev,
      [tripId]: prev[tripId] ?? getDefaultRegenerationControls(editable),
    }));

    if (previous) {
      setLockedItemIds((prev) => ({
        ...prev,
        [tripId]: preserveSelectionIds(previous, editable, prev[tripId] ?? []),
      }));
      setFavoriteItemIds((prev) => ({
        ...prev,
        [tripId]: preserveSelectionIds(previous, editable, prev[tripId] ?? []),
      }));
    } else {
      setLockedItemIds((prev) => ({ ...prev, [tripId]: prev[tripId] ?? [] }));
      setFavoriteItemIds((prev) => ({ ...prev, [tripId]: prev[tripId] ?? [] }));
    }
  };

  const toggleDraftSelection = (
    tripId: number,
    itemId: string,
    setter: (updater: (prev: Record<number, string[]>) => Record<number, string[]>) => void,
  ) => {
    setter((prev) => {
      const current = new Set(prev[tripId] ?? []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      return { ...prev, [tripId]: Array.from(current) };
    });
  };

  const handleAddMember = async (tripId: number) => {
    const email = (memberDrafts[tripId] ?? '').trim();
    if (!email) return;

    setMemberErrors((prev) => ({ ...prev, [tripId]: null }));
    setMemberFeedback((prev) => ({ ...prev, [tripId]: null }));
    setAddingMemberIds((prev) => new Set(prev).add(tripId));

    try {
      const invite = await createTripInvite(token, tripId, email);
      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                pending_invites: [...trip.pending_invites, invite],
              }
            : trip,
        ),
      );
      setMemberDrafts((prev) => ({ ...prev, [tripId]: '' }));
      setMemberFeedback((prev) => ({ ...prev, [tripId]: `Invite ready: ${invite.invite_url}` }));
      track({
        name: 'trip_invite_created',
        props: {
          trip_id: tripId,
          pending_invite_id: invite.id,
        },
      });
    } catch (err) {
      setMemberErrors((prev) => ({
        ...prev,
        [tripId]: err instanceof Error ? err.message : 'Failed to add member.',
      }));
    } finally {
      setAddingMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    setActionError(null);
    try {
      await deleteTrip(token, trip.id);
      const remaining = trips.filter((row) => row.id !== trip.id);
      setTrips(remaining);
      setConfirmDelete(false);
      if (selectedTripId === trip.id) {
        const nextTripId = remaining[0]?.id ?? null;
        setSelectedTripId(nextTripId);
        onTripSelect?.(nextTripId);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete trip.');
    }
  };

  const handleGenerateSmart = async (trip: Trip) => {
    setActionError(null);
    setGeneratingSmartIds((prev) => new Set(prev).add(trip.id));

    const controller = new AbortController();
    const hardTimeout = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      const itinerary = await planItinerarySmart(
        token,
        trip.id,
        { interests_override: trip.notes ?? undefined },
        controller.signal,
      );
      upsertDraftItinerary(trip.id, itinerary, pendingItineraries[trip.id]);
      track({
        name: 'itinerary_generated',
        props: {
          trip_id: trip.id,
          source: itinerary.source,
          source_label: itinerary.source_label,
          fallback_used: itinerary.fallback_used,
          day_count: itinerary.days.length,
        },
      });
      setActiveTab('plan');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setActionError('Trip planning took too long. Try again. Shorter trips and more specific destinations tend to finish faster.');
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to generate itinerary.');
      }
    } finally {
      window.clearTimeout(hardTimeout);
      setGeneratingSmartIds((prev) => {
        const next = new Set(prev);
        next.delete(trip.id);
        return next;
      });
    }
  };

  const handleApply = async (tripId: number) => {
    const itinerary = pendingItineraries[tripId]
      ?? (streams[tripId]?.itinerary ? toEditableItinerary(streams[tripId].itinerary) : null);
    if (!itinerary) return;

    setActionError(null);
    setApplyingIds((prev) => new Set(prev).add(tripId));

    try {
      await applyItinerary(token, tripId, toApiItinerary(itinerary));
      const freshTrips = await getTrips(token);
      setTrips(freshTrips);
      const meta = draftPlanMeta[tripId];
      track({
        name: 'itinerary_applied',
        props: {
          trip_id: tripId,
          source: meta?.source ?? 'unknown',
          source_label: meta?.sourceLabel ?? 'Unknown',
          fallback_used: meta?.fallbackUsed ?? false,
        },
      });
      resetStream(tripId);
      setPendingItineraries((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setDraftPlanMeta((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setLockedItemIds((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      setFavoriteItemIds((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to apply itinerary.');
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleRegenerateDraft = async (tripId: number) => {
    const current = pendingItineraries[tripId];
    const controls = regenerationControls[tripId];
    if (!current || !controls) return;

    setActionError(null);
    setRegeneratingIds((prev) => new Set(prev).add(tripId));
    try {
      const refined = await refineItinerary(token, tripId, {
        current_itinerary: toApiItinerary(current),
        locked_items: buildItemReferences(current, lockedItemIds[tripId] ?? []),
        favorite_items: buildItemReferences(current, favoriteItemIds[tripId] ?? []),
        regenerate_day_number: controls.dayNumber,
        regenerate_time_block: controls.timeBlock === 'full_day' ? undefined : controls.timeBlock,
        variant: controls.variant,
      });
      upsertDraftItinerary(tripId, refined, current);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to refine itinerary.');
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(tripId);
        return next;
      });
    }
  };

  const handleMoveDraftItem = (
    tripId: number,
    sourceDayNumber: number,
    sourceIndex: number,
    targetDayNumber: number,
    targetIndex: number,
  ) => {
    setPendingItineraries((prev) => {
      const current = prev[tripId];
      if (!current) return prev;
      return {
        ...prev,
        [tripId]: moveEditableItineraryItem(
          current,
          sourceDayNumber,
          sourceIndex,
          targetDayNumber,
          targetIndex,
        ),
      };
    });
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-espresso sm:text-2xl">Trip Workspace</h2>
            <p className="mt-0.5 text-sm text-flint">Shared trip planning with personal prep kept separate.</p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateClick}
            className="rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber/25"
          >
            + New Trip
          </motion.button>
        </div>
        <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-espresso sm:text-2xl">Trip Workspace</h2>
          <p className="mt-0.5 text-sm text-flint">Shared trip planning with personal prep kept separate.</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-smoke py-20 text-center">
          <div>
            <h3 className="text-lg font-bold text-espresso">No trips yet</h3>
            <p className="mt-1 text-sm text-flint">Create your first trip to open a shared planning workspace.</p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateClick}
            className="rounded-full bg-amber px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber/25"
          >
            + Create your first trip
          </motion.button>
        </div>
      </div>
    );
  }

  const selectedTripIsOwner = Boolean(
    selectedTrip?.members.some((member) => member.email === currentUserEmail && member.role === 'owner'),
  );
  const selectedMemberDraft = selectedTrip ? memberDrafts[selectedTrip.id] ?? '' : '';
  const selectedMemberError = selectedTrip ? memberErrors[selectedTrip.id] : null;
  const selectedMemberFeedback = selectedTrip ? memberFeedback[selectedTrip.id] : null;
  const selectedIsAddingMember = selectedTrip ? addingMemberIds.has(selectedTrip.id) : false;
  const selectedIsViewingSaved = selectedTrip ? viewingIds.has(selectedTrip.id) : false;
  const selectedIsStreaming = selectedTrip ? streams[selectedTrip.id]?.streaming ?? false : false;
  const selectedStreamText = selectedTrip ? streams[selectedTrip.id]?.text ?? '' : '';
  const selectedStreamError = selectedTrip ? streams[selectedTrip.id]?.error ?? null : null;
  const selectedIsGeneratingSmart = selectedTrip ? generatingSmartIds.has(selectedTrip.id) : false;
  const selectedIsRegenerating = selectedTrip ? regeneratingIds.has(selectedTrip.id) : false;
  const selectedIsApplying = selectedTrip ? applyingIds.has(selectedTrip.id) : false;
  const selectedIsAnyGenerating = selectedIsStreaming || selectedIsGeneratingSmart;
  const selectedPreferences = selectedTrip ? parsePreferences(selectedTrip.notes) : null;
  const selectedDurationDays = selectedTrip ? getTripDurationDays(selectedTrip.start_date, selectedTrip.end_date) : 0;
  const selectedVisibleMembers = selectedTrip?.members.slice(0, 4) ?? [];
  const selectedExtraMembers = selectedTrip ? Math.max(0, selectedTrip.members.length - selectedVisibleMembers.length) : 0;
  const selectedHeroAccent = selectedTrip ? getTripAccentClasses(selectedTrip.id) : null;
  const tabBadgeCount: Partial<Record<WorkspaceTab, number>> = {
    members: selectedTrip?.member_count,
    bookings: selectedReservationSummary?.upcoming ?? 0,
  };
  const summaryCards = selectedTrip ? [
    {
      id: 'members',
      label: 'Travellers',
      value: String(selectedTrip.member_count),
      sub: selectedTrip.member_count === 1 ? 'Solo trip for now' : 'Across the shared workspace',
      icon: <UsersIcon size={16} strokeWidth={1.8} />,
      tone: 'text-olive bg-olive/10',
      progress: null as number | null,
    },
    {
      id: 'bookings',
      label: 'Bookings',
      value: String(selectedReservationSummary?.total ?? 0),
      sub: `${selectedReservationSummary?.upcoming ?? 0} upcoming shared reservations`,
      icon: <CalendarIcon size={16} strokeWidth={1.8} />,
      tone: 'text-espresso bg-espresso/10',
      progress: null as number | null,
    },
    {
      id: 'packing',
      label: 'Packed',
      value: `${selectedPackingSummary?.progressPct ?? 0}%`,
      sub: `${packingSnapshotLabel(selectedPackingSummary)} · personal`,
      icon: <PackageIcon size={16} strokeWidth={1.8} />,
      tone: 'text-clay bg-clay/10',
      progress: selectedPackingSummary?.progressPct ?? 0,
    },
    {
      id: 'budget',
      label: 'Budget',
      value:
        selectedBudgetSummary?.limit === null || selectedBudgetSummary?.limit === undefined
          ? 'Unset'
          : `$${Math.round(selectedBudgetSummary.limit)}`,
      sub:
        selectedBudgetSummary?.limit === null || selectedBudgetSummary?.limit === undefined
          ? 'Set a personal budget target'
          : selectedBudgetSummary.isOverBudget
            ? 'Currently over budget'
            : 'Tracking inside target',
      icon: <WalletIcon size={16} strokeWidth={1.8} />,
      tone: 'text-amber bg-amber/10',
      progress:
        selectedBudgetSummary?.limit && selectedBudgetSummary.limit > 0
          ? Math.min(100, Math.round((selectedBudgetSummary.totalSpent / selectedBudgetSummary.limit) * 100))
          : null,
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-clay">Trip Workspace</p>
          <h2 className="mt-2 text-3xl font-display font-semibold text-espresso sm:text-4xl">
            Plan together, prep personally.
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-flint">
            One trip workspace for the group, with your own budget, packing, and readiness kept separate.
          </p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber/25"
        >
          <PlusIcon size={15} strokeWidth={2.3} />
          New Trip
        </motion.button>
      </div>

      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
            role="alert"
          >
            {actionError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside>
          <div className="overflow-hidden rounded-[28px] border border-smoke/80 bg-parchment/60 shadow-sm">
            <div className="border-b border-smoke/80 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-espresso">Trips</p>
                  <p className="text-xs text-flint">Choose a workspace to open.</p>
                </div>
                <span className="rounded-full border border-smoke bg-white px-2.5 py-1 text-xs font-semibold text-flint">
                  {filteredTrips.length}
                </span>
              </div>

              <div className="relative mt-4">
                <SearchIcon
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={sidebarQuery}
                  onChange={(event) => setSidebarQuery(event.target.value)}
                  placeholder="Search trips"
                  className="w-full rounded-2xl border border-smoke bg-white py-2.5 pl-9 pr-3 text-sm text-espresso outline-none transition-all focus:border-amber focus:ring-2 focus:ring-amber/20"
                />
              </div>
            </div>

            <div className="max-h-[calc(100vh-17rem)] overflow-y-auto px-3 py-4">
              {currentTrips.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Current</p>
                  <div className="mt-1 space-y-1.5">
                    {currentTrips.map((trip) => {
                      const status = getTripStatus(trip.start_date, trip.end_date);
                      const isSelected = trip.id === selectedTripId;
                      const accent = getTripAccentClasses(trip.id);
                      return (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => selectTrip(trip.id)}
                          className={[
                            'relative w-full rounded-2xl border px-3 py-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border-[#DDD0C0] bg-white shadow-sm'
                              : 'border-transparent hover:border-smoke hover:bg-white/80',
                          ].join(' ')}
                        >
                          {isSelected && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-amber" />}
                          <div className="flex items-start gap-3">
                            <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${accent.block} shadow-sm`}>
                              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                {getTripMonogram(trip)}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-display text-lg leading-none text-espresso">{trip.title}</p>
                                  <div className="mt-1 flex items-center gap-1.5 text-xs text-flint">
                                    <MapPinIcon size={11} strokeWidth={2} className="text-muted" />
                                    <span className="truncate">{trip.destination}</span>
                                  </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[status].cls}`}>
                                  {STATUS_CONFIG[status].label}
                                </span>
                              </div>
                              <p className="mt-2 text-[11px] text-muted">
                                {formatTripDateRange(trip.start_date, trip.end_date, true)} · {getTripDurationDays(trip.start_date, trip.end_date)}d
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastTrips.length > 0 && (
                <div className={currentTrips.length > 0 ? 'mt-5' : ''}>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Past</p>
                  <div className="mt-1 space-y-1.5">
                    {pastTrips.map((trip) => {
                      const status = getTripStatus(trip.start_date, trip.end_date);
                      const isSelected = trip.id === selectedTripId;
                      const accent = getTripAccentClasses(trip.id);
                      return (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => selectTrip(trip.id)}
                          className={[
                            'relative w-full rounded-2xl border px-3 py-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border-[#DDD0C0] bg-white shadow-sm'
                              : 'border-transparent hover:border-smoke hover:bg-white/80',
                          ].join(' ')}
                        >
                          {isSelected && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-amber" />}
                          <div className="flex items-start gap-3 opacity-80">
                            <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${accent.block}`}>
                              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/95">
                                {getTripMonogram(trip)}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-display text-lg leading-none text-espresso">{trip.title}</p>
                                  <div className="mt-1 flex items-center gap-1.5 text-xs text-flint">
                                    <MapPinIcon size={11} strokeWidth={2} className="text-muted" />
                                    <span className="truncate">{trip.destination}</span>
                                  </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[status].cls}`}>
                                  {STATUS_CONFIG[status].label}
                                </span>
                              </div>
                              <p className="mt-2 text-[11px] text-muted">
                                {formatTripDateRange(trip.start_date, trip.end_date, true)} · {getTripDurationDays(trip.start_date, trip.end_date)}d
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredTrips.length === 0 && (
                <div className="px-4 py-16 text-center">
                  <SearchIcon size={20} strokeWidth={2} className="mx-auto text-muted" />
                  <p className="mt-3 text-sm font-semibold text-espresso">No trips match that search.</p>
                  <p className="mt-1 text-sm text-flint">Try a destination or trip name instead.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {selectedTrip && selectedTripStatus && (
          <div className="space-y-6 min-w-0">
            <section className="relative overflow-hidden rounded-[30px] border border-smoke/80 bg-white shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${selectedHeroAccent?.block ?? 'from-espresso via-clay to-amber'}`} />
              <div className={`absolute -right-12 top-6 h-44 w-44 rounded-full blur-3xl ${selectedHeroAccent?.glow ?? 'bg-amber/20'}`} />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(28,25,23,0.88)_0%,rgba(28,25,23,0.62)_55%,rgba(28,25,23,0.28)_100%)]" />
              <div className="relative p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CONFIG[selectedTripStatus].cls}`}>
                        {STATUS_CONFIG[selectedTripStatus].label}
                      </span>
                      {selectedSavedItinerary && (
                        <span className="rounded-full border border-amber/30 bg-amber/15 px-2.5 py-1 text-xs font-bold text-amber">
                          Planned
                        </span>
                      )}
                      <span className="text-xs font-medium text-white/65">
                        {getTripTimelineLabel(selectedTrip.start_date, selectedTrip.end_date)}
                      </span>
                    </div>

                    <div>
                      <h3 className="max-w-2xl font-display text-4xl font-semibold leading-none text-white sm:text-5xl">
                        {selectedTrip.title}
                      </h3>
                      <p className="mt-2 text-base font-medium text-white/78">{selectedTrip.destination}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/72">
                      <div className="flex items-center gap-2">
                        <MapPinIcon size={14} strokeWidth={2} className="text-white/55" />
                        <span>{selectedTrip.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon size={14} strokeWidth={2} className="text-white/55" />
                        <span>{formatTripDateRange(selectedTrip.start_date, selectedTrip.end_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GlobeIcon size={14} strokeWidth={2} className="text-white/55" />
                        <span>{selectedDurationDays} day trip</span>
                      </div>
                    </div>

                    {selectedPreferences ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPreferences.budget && (
                          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88">
                            {selectedPreferences.budget}
                          </span>
                        )}
                        {selectedPreferences.pace && (
                          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88">
                            {selectedPreferences.pace}
                          </span>
                        )}
                        {selectedPreferences.interests?.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/82"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : selectedTrip.notes ? (
                      <p className="max-w-2xl text-sm italic text-white/72">{selectedTrip.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <PillButton variant="ghost" onClick={() => setEditingTrip(selectedTrip)}>
                      Edit Trip
                    </PillButton>
                    <PillButton variant="ghost" onClick={() => setActiveTab('plan')}>
                      Open Plan
                    </PillButton>
                    {selectedTripIsOwner && (
                      <PillButton variant="ghost" onClick={() => setActiveTab('members')}>
                        Manage Members
                      </PillButton>
                    )}
                    {selectedTripIsOwner && (
                      <PillButton variant="danger" onClick={() => setConfirmDelete((prev) => !prev)}>
                        {confirmDelete ? 'Cancel Delete' : 'Delete Trip'}
                      </PillButton>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {selectedVisibleMembers.map((member, index) => (
                        <div
                          key={`${selectedTrip.id}-${member.user_id}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-espresso/30 text-xs font-bold ${getAvatarTone(index)}`}
                          title={member.email}
                        >
                          {getMemberInitials(member.email)}
                        </div>
                      ))}
                      {selectedExtraMembers > 0 && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/15 bg-white/10 text-xs font-bold text-white/80 backdrop-blur-sm">
                          +{selectedExtraMembers}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {selectedTrip.member_count} traveller{selectedTrip.member_count === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-white/60">Shared itinerary, bookings, and map for everyone on this trip.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/88 backdrop-blur-sm transition-colors hover:bg-white/14"
                  >
                    <ShareIcon size={13} strokeWidth={2} />
                    Invite to trip
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.id} className="rounded-2xl border border-smoke/70 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-3xl leading-none text-espresso">{card.value}</p>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                          {card.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-flint">{card.sub}</p>
                      {card.progress !== null && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-parchment">
                          <div
                            className={card.id === 'packing' ? 'h-full rounded-full bg-clay' : 'h-full rounded-full bg-amber'}
                            style={{ width: `${Math.min(card.progress, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {confirmDelete && selectedTripIsOwner && (
              <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-4">
                <p className="text-sm font-semibold text-danger">Delete this trip workspace?</p>
                <p className="mt-1 text-sm text-danger/90">
                  This removes the shared trip and every member’s personal prep state for it.
                </p>
                <div className="mt-3 flex gap-2">
                  <PillButton variant="danger" onClick={() => void handleDeleteTrip(selectedTrip)}>
                    Delete Trip
                  </PillButton>
                  <PillButton variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Keep Trip
                  </PillButton>
                </div>
              </div>
            )}

            <section className="min-w-0 overflow-hidden rounded-3xl border border-smoke/60 bg-white shadow-sm">
              <div className="border-b border-smoke/70 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-clay">
                      {activeGroup === 'shared' ? 'Shared Trip' : 'My Trip Prep'}
                    </p>
                    <h4 className="mt-2 font-display text-3xl text-espresso">{selectedTabMeta.label}</h4>
                    <p className="mt-1 text-sm text-flint">{selectedTabMeta.helper}</p>
                    <p className="mt-3 inline-flex rounded-full border border-smoke bg-parchment/70 px-3 py-1.5 text-xs font-semibold text-flint">
                      {activeGroup === 'shared'
                        ? 'Visible to trip members with access'
                        : 'Visible only to you'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-smoke bg-parchment/70 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('plan')}
                      className={[
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer',
                        activeGroup === 'shared'
                          ? 'border border-smoke bg-white text-espresso shadow-sm'
                          : 'text-flint hover:text-espresso',
                      ].join(' ')}
                    >
                      <GlobeIcon size={14} strokeWidth={2} className={activeGroup === 'shared' ? 'text-clay' : 'text-muted'} />
                      Shared
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('budget')}
                      className={[
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer',
                        activeGroup === 'personal'
                          ? 'border border-smoke bg-white text-espresso shadow-sm'
                          : 'text-flint hover:text-espresso',
                      ].join(' ')}
                    >
                      <UserIcon size={14} strokeWidth={2} className={activeGroup === 'personal' ? 'text-amber' : 'text-muted'} />
                      My Prep
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-1 border-b border-smoke/80">
                  {(activeGroup === 'shared' ? SHARED_TABS : PERSONAL_TABS).map((tab) => {
                    const disabled = tab.id === 'map' && selectedSavedItinerary === null;
                    const badge = tabBadgeCount[tab.id] ?? 0;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => !disabled && setActiveTab(tab.id)}
                        disabled={disabled}
                        className={[
                          'relative -mb-px inline-flex items-center gap-2 rounded-t-xl border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors',
                          activeTab === tab.id
                            ? activeGroup === 'shared'
                              ? 'border-clay text-espresso'
                              : 'border-amber text-espresso'
                            : 'border-transparent text-flint hover:text-espresso',
                          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        <span className={activeTab === tab.id ? (activeGroup === 'shared' ? 'text-clay' : 'text-amber') : 'text-muted'}>
                          {tab.icon}
                        </span>
                        {tab.label}
                        {badge > 0 && (
                          <span
                            className={[
                              'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
                              activeGroup === 'shared' ? 'bg-clay' : 'bg-amber',
                            ].join(' ')}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6 min-w-0">
                <AnimatePresence>
                  {selectedStreamError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                      role="alert"
                    >
                      {selectedStreamError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedIsStreaming && selectedTrip && (
                  <StreamingDisplay
                    text={selectedStreamText}
                    onCancel={() => resetStream(selectedTrip.id)}
                  />
                )}

                {selectedIsGeneratingSmart && (
                  <div className="flex items-center gap-3 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3">
                    <div className="h-4 w-4 rounded-full border-2 border-clay border-t-transparent animate-spin" />
                    <span className="text-sm font-medium text-clay">Generating Smart Plan...</span>
                  </div>
                )}

                {activeTab === 'plan' && selectedTrip && (
                  <div className="space-y-4">
                    {!selectedIsStreaming && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                        <PillButton
                          variant="ocean"
                          onClick={() => startStream(selectedTrip.id, selectedTrip.notes ?? undefined)}
                          disabled={selectedIsAnyGenerating}
                        >
                          AI Enhancement
                        </PillButton>
                        <PillButton
                          variant="coral"
                          onClick={() => void handleGenerateSmart(selectedTrip)}
                          disabled={selectedIsAnyGenerating}
                          busy={selectedIsGeneratingSmart}
                        >
                          {selectedIsGeneratingSmart ? 'Working...' : 'Generate Plan'}
                        </PillButton>
                        {selectedSavedItinerary && (
                          <>
                            <PillButton variant="ghost" onClick={() => toggleSavedPlanView(selectedTrip.id)}>
                              {selectedIsViewingSaved ? 'Hide Saved Plan' : 'View Saved Plan'}
                            </PillButton>
                            <PillButton
                              variant="ghost"
                              onClick={() => upsertDraftItinerary(selectedTrip.id, selectedSavedItinerary, selectedPendingItinerary ?? undefined)}
                            >
                              Edit Saved As Draft
                            </PillButton>
                          </>
                        )}
                        </div>
                        <div className="rounded-2xl border border-smoke bg-parchment/50 px-4 py-3 text-sm text-flint">
                          Default production planning uses the live rule-based planner first. AI enhancement is optional and clearly labeled when used.
                        </div>
                        <div className="rounded-2xl border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-flint">
                          AI-assisted itineraries and third-party travel data can be incomplete or outdated. Review availability, opening hours, routes, and prices before you book anything.
                        </div>
                        <div className="rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-flint">
                          When you apply a draft here, it becomes the shared itinerary for this trip and updates what other members see.
                        </div>
                      </div>
                    )}

                    {!selectedIsStreaming && selectedPendingItinerary && selectedControls ? (
                      <div className="space-y-3">
                        {selectedDraftPlanMeta ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-smoke bg-parchment/50 px-4 py-3 text-sm text-flint">
                            <span className="rounded-full border border-smoke bg-white px-2.5 py-1 text-xs font-semibold text-espresso">
                              Source: {selectedDraftPlanMeta.sourceLabel}
                            </span>
                            {selectedDraftPlanMeta.fallbackUsed ? (
                              <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">
                                Fallback used
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <EditableItineraryPanel
                          itinerary={selectedPendingItinerary}
                          onApply={() => handleApply(selectedTrip.id)}
                          applying={selectedIsApplying}
                          regenerating={selectedIsRegenerating}
                          lockedItemIds={lockedItemIds[selectedTrip.id] ?? []}
                          favoriteItemIds={favoriteItemIds[selectedTrip.id] ?? []}
                          regenerateDayNumber={selectedControls.dayNumber}
                          regenerateTimeBlock={selectedControls.timeBlock}
                          regenerateVariant={selectedControls.variant}
                          onMoveItem={(sourceDayNumber, sourceIndex, targetDayNumber, targetIndex) =>
                            handleMoveDraftItem(
                              selectedTrip.id,
                              sourceDayNumber,
                              sourceIndex,
                              targetDayNumber,
                              targetIndex,
                            )
                          }
                          onToggleLock={(itemId) => toggleDraftSelection(selectedTrip.id, itemId, setLockedItemIds)}
                          onToggleFavorite={(itemId) => toggleDraftSelection(selectedTrip.id, itemId, setFavoriteItemIds)}
                          onRegenerateDayChange={(dayNumber) =>
                            setRegenerationControls((prev) => ({
                              ...prev,
                              [selectedTrip.id]: { ...(prev[selectedTrip.id] ?? selectedControls), dayNumber },
                            }))
                          }
                          onRegenerateTimeBlockChange={(timeBlock) =>
                            setRegenerationControls((prev) => ({
                              ...prev,
                              [selectedTrip.id]: { ...(prev[selectedTrip.id] ?? selectedControls), timeBlock },
                            }))
                          }
                          onRegenerateVariantChange={(variant) =>
                            setRegenerationControls((prev) => ({
                              ...prev,
                              [selectedTrip.id]: { ...(prev[selectedTrip.id] ?? selectedControls), variant },
                            }))
                          }
                          onRegenerate={() => handleRegenerateDraft(selectedTrip.id)}
                        />
                      </div>
                    ) : selectedIsViewingSaved && selectedSavedItinerary ? (
                      <ItineraryPanel itinerary={selectedSavedItinerary} />
                    ) : !selectedSavedItinerary && !selectedPendingItinerary && !selectedIsStreaming ? (
                      <div className="rounded-3xl border border-dashed border-smoke bg-parchment/40 px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-espresso">No shared itinerary yet</p>
                        <p className="mt-1 text-sm text-flint">
                          Start the shared plan first so the group can align on one itinerary before personal prep branches off.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'map' && (
                  selectedSavedItinerary ? (
                    <ItineraryMap key={`trip-map-${selectedTrip.id}`} itinerary={selectedSavedItinerary} />
                  ) : (
                    <div className="rounded-3xl border border-dashed border-smoke bg-parchment/40 px-6 py-10 text-center">
                      <p className="text-sm font-semibold text-espresso">Map unavailable</p>
                      <p className="mt-1 text-sm text-flint">Save a shared itinerary first to unlock the trip map for everyone on this trip.</p>
                    </div>
                  )
                )}

                {activeTab === 'members' && (
                  <div className="rounded-3xl border border-smoke/60 bg-white p-6 shadow-sm">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div>
                        <p className="text-sm font-semibold text-espresso">Trip members</p>
                        <p className="mt-1 text-sm text-flint">
                          Shared trip planning works best when everyone can see who is in the group and what is shared.
                        </p>
                        <div className="mt-4 space-y-3">
                          {selectedTrip.members.map((member) => (
                            <div
                              key={`${selectedTrip.id}-${member.user_id}`}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-smoke bg-parchment/40 px-4 py-4"
                            >
                              <div>
                                <p className="text-sm font-semibold text-espresso">{member.email}</p>
                                <p className="mt-1 text-xs text-flint">
                                  Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <span
                                className={[
                                  'rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                                  member.role === 'owner'
                                    ? 'border-espresso/20 bg-espresso/10 text-espresso'
                                    : 'border-smoke bg-white text-flint',
                                ].join(' ')}
                              >
                                {member.role}
                              </span>
                            </div>
                          ))}
                          {selectedTrip.pending_invites.map((invite) => (
                            <div
                              key={`${selectedTrip.id}-invite-${invite.id}`}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-amber/20 bg-amber/5 px-4 py-4"
                            >
                              <div>
                                <p className="text-sm font-semibold text-espresso">{invite.email}</p>
                                <p className="mt-1 text-xs text-flint">
                                  Pending invite · expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <span className="rounded-full border border-amber/30 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber">
                                {invite.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-smoke bg-parchment/40 px-4 py-4">
                        <p className="text-sm font-semibold text-espresso">Roles and boundaries</p>
                        <div className="mt-3 space-y-3 text-sm text-flint">
                          <p>Shared: destination, dates, itinerary, map, and bookings.</p>
                          <p>Personal: budget, packing, and ready items.</p>
                          <p>Each traveller keeps their own personal prep, even after joining the same trip.</p>
                          <p>{selectedTripIsOwner ? 'You can invite more members into this workspace.' : 'The owner manages invitations for this workspace.'}</p>
                        </div>

                        {selectedTripIsOwner ? (
                          <div className="mt-5">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-flint">
                              Invite by email
                            </label>
                            <p className="mt-2 text-sm text-flint">
                              Invited members join the shared trip workspace. Their budget, packing, and ready lists stay personal to them.
                            </p>
                            <div className="mt-2 flex gap-2">
                              <input
                                type="email"
                                value={selectedMemberDraft}
                                onChange={(event) =>
                                  setMemberDrafts((prev) => ({
                                    ...prev,
                                    [selectedTrip.id]: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void handleAddMember(selectedTrip.id);
                                  }
                                }}
                                placeholder="traveler@example.com"
                                className="flex-1 rounded-full border border-smoke bg-white px-4 py-2.5 text-sm text-espresso"
                              />
                              <button
                                type="button"
                                onClick={() => void handleAddMember(selectedTrip.id)}
                                disabled={!selectedMemberDraft.trim() || selectedIsAddingMember}
                                className="rounded-full bg-amber px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber/25 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {selectedIsAddingMember ? 'Creating…' : 'Invite'}
                              </button>
                            </div>
                            {selectedMemberError && <p className="mt-2 text-sm text-danger">{selectedMemberError}</p>}
                            {selectedMemberFeedback && (
                              <div className="mt-2 rounded-2xl border border-olive/20 bg-olive/10 px-3 py-3 text-sm text-olive break-all">
                                {selectedMemberFeedback}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'bookings' && (
                  <ReservationsPanel token={token} tripId={selectedTrip.id} />
                )}

                {activeTab === 'budget' && (
                  <BudgetTracker
                    token={token}
                    tripId={selectedTrip.id}
                    onSummaryChange={(summary) =>
                      setBudgetSummaries((prev) => ({ ...prev, [selectedTrip.id]: summary }))
                    }
                  />
                )}

                {activeTab === 'packing' && (
                  <PackingList
                    token={token}
                    tripId={selectedTrip.id}
                    onSummaryChange={(summary) =>
                      setPackingSummaries((prev) => ({ ...prev, [selectedTrip.id]: summary }))
                    }
                  />
                )}

                {activeTab === 'prep' && (
                  <PrepPanel
                    token={token}
                    tripId={selectedTrip.id}
                    destination={selectedTrip.destination}
                    startDate={selectedTrip.start_date}
                  />
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingTrip && (
          <EditTripModal
            key={editingTrip.id}
            token={token}
            trip={editingTrip}
            onSuccess={(updatedTrip) => {
              setTrips((prev) => prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)));
              setEditingTrip(null);
            }}
            onClose={() => setEditingTrip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

import { useMemo } from 'react';
import type { Trip } from '../../shared/api/trips';


export interface TravelStats {
  totalTrips: number;
  uniqueDestinations: string[];
  totalDays: number;
  tripsWithItinerary: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  unearnedCls: string;
  earnedCls: string;
}

export interface ProfileStats {
  stats: TravelStats;
  badges: Badge[];
  title: string;
}


interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  unearnedCls: string;
  earnedCls: string;
  check: (trips: Trip[]) => boolean;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    id: 'first-adventure',
    name: 'First Adventure',
    description: 'Created your first trip',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-amber text-white border-amber shadow-sm shadow-amber/25',
    check: (trips) => trips.length >= 1,
  },
  {
    id: 'itinerary-pro',
    name: 'Itinerary Pro',
    description: 'Saved an AI-generated itinerary',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-clay text-white border-clay shadow-sm shadow-clay/20',
    check: (trips) => trips.some((t) => !!t.description),
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: '3 unique destinations planned',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-amber/20 text-espresso border-amber/40 shadow-sm',
    check: (trips) => new Set(trips.map((t) => t.destination.trim())).size >= 3,
  },
  {
    id: 'packing-pro',
    name: 'Packing Pro',
    description: 'Built a packing list for a trip',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-clay text-white border-clay shadow-sm shadow-clay/20',
    check: (trips) =>
      trips.some((t) => {
        try {
          const raw = localStorage.getItem(`packing_${t.id}`);
          if (!raw) return false;
          const parsed: unknown = JSON.parse(raw);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      }),
  },
  {
    id: 'budget-savvy',
    name: 'Budget Savvy',
    description: 'Set a budget for a trip',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-amber/20 text-espresso border-amber/40 shadow-sm',
    check: (trips) =>
      trips.some((t) => {
        try {
          const raw = localStorage.getItem(`budget_${t.id}`);
          if (!raw) return false;
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null) return false;
          return (parsed as Record<string, unknown>).limit !== null;
        } catch {
          return false;
        }
      }),
  },
  {
    id: 'long-hauler',
    name: 'Long Hauler',
    description: 'Planned a trip of 7 or more days',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-olive text-white border-olive shadow-sm shadow-olive/20',
    check: (trips) =>
      trips.some((t) => {
        const days = Math.round(
          (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86_400_000,
        );
        return days >= 7;
      }),
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    description: '5 or more unique destinations',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-olive text-white border-olive shadow-sm shadow-olive/20',
    check: (trips) => new Set(trips.map((t) => t.destination.trim())).size >= 5,
  },
  {
    id: 'frequent-flyer',
    name: 'Frequent Flyer',
    description: '5 or more trips created',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-espresso text-white border-espresso shadow-sm',
    check: (trips) => trips.length >= 5,
  },
];


function computeTravelTitle(tripCount: number): string {
  if (tripCount === 0) return 'Aspiring Adventurer';
  if (tripCount <= 2)  return 'Rookie Explorer';
  if (tripCount <= 4)  return 'Seasoned Traveller';
  if (tripCount <= 9)  return 'Globetrotter';
  return 'World Wanderer';
}

function computeTotalDays(trips: Trip[]): number {
  return trips.reduce((sum, t) => {
    const days = Math.max(
      0,
      Math.round(
        (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86_400_000,
      ),
    );
    return sum + days;
  }, 0);
}



export function useProfileStats(trips: Trip[]): ProfileStats {
  return useMemo(() => {
    const uniqueDestinations = [...new Set(trips.map((t) => t.destination.trim()))];
    const tripsWithItinerary = trips.filter((t) => !!t.description).length;

    const stats: TravelStats = {
      totalTrips: trips.length,
      uniqueDestinations,
      totalDays: computeTotalDays(trips),
      tripsWithItinerary,
    };

    const badges: Badge[] = BADGE_CONFIGS.map(
      ({ id, name, description, unearnedCls, earnedCls, check }) => ({
        id,
        name,
        description,
        earned: check(trips),
        unearnedCls,
        earnedCls,
      }),
    );

    return { stats, badges, title: computeTravelTitle(trips.length) };
  }, [trips]);
}

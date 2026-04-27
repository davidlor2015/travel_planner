// Path: ui/src/features/profile/useProfileStats.ts
// Summary: Provides useProfileStats hook behavior.

import { useMemo, useState } from 'react';
import type { Trip } from '../../shared/api/trips';


export interface TravelStats {
  totalTrips: number;
  uniqueDestinations: string[];
  totalDays: number;
  tripsWithItinerary: number;
  upcomingTrips: number;
  completedTrips: number;
  activeTrips: number;
  longestTripDays: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  unearnedCls: string;
  earnedCls: string;
  progressCurrent: number;
  progressTarget: number;
  progressLabel: string;
}

export interface JourneyEntry {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  durationDays: number;
  status: 'upcoming' | 'active' | 'completed';
  hasItinerary: boolean;
}

export interface ProfileStats {
  stats: TravelStats;
  badges: Badge[];
  title: string;
  nextBadge: Badge | null;
  recentTrips: JourneyEntry[];
}


interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  unearnedCls: string;
  earnedCls: string;
  getProgress: (trips: Trip[]) => { current: number; target: number };
}

function destinationCount(trips: Trip[]): number {
  return new Set(trips.map((t) => t.destination.trim())).size;
}

function getTripDurationDays(trip: Trip): number {
  return Math.max(
    0,
    Math.round(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000,
    ),
  );
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    id: 'jet-setter',
    name: 'Jet Setter',
    description: 'Create 3 trips',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-amber text-white border-amber shadow-sm shadow-amber/25',
    getProgress: (trips) => ({ current: trips.length, target: 3 }),
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Save 1 itinerary',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-clay text-white border-clay shadow-sm shadow-clay/20',
    getProgress: (trips) => ({
      current: trips.filter((t) => Boolean(t.description)).length,
      target: 1,
    }),
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: '3 unique destinations planned',
    unearnedCls: 'bg-parchment text-flint border-smoke',
    earnedCls: 'bg-amber/20 text-espresso border-amber/40 shadow-sm',
    getProgress: (trips) => ({ current: destinationCount(trips), target: 3 }),
  },
];


function computeTravelTitle(tripCount: number): string {
  if (tripCount === 0) return 'Aspiring Adventurer';
  if (tripCount <= 2)  return 'Rookie Explorer';
  if (tripCount <= 4)  return 'Seasoned Traveler';
  if (tripCount <= 9)  return 'Globetrotter';
  return 'World Wanderer';
}

function computeTotalDays(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + getTripDurationDays(t), 0);
}

function buildJourneyEntry(trip: Trip, now: number): JourneyEntry {
  const start = new Date(trip.start_date).getTime();
  const end = new Date(trip.end_date).getTime();
  const status: JourneyEntry['status'] =
    start > now ? 'upcoming' : end < now ? 'completed' : 'active';

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    createdAt: trip.created_at,
    durationDays: getTripDurationDays(trip),
    status,
    hasItinerary: Boolean(trip.description),
  };
}

export function useProfileStats(trips: Trip[]): ProfileStats {
  const [now] = useState(() => Date.now());

  return useMemo(() => {
    const uniqueDestinations = [...new Set(trips.map((t) => t.destination.trim()))];
    const tripsWithItinerary = trips.filter((t) => !!t.description).length;
    const journeyEntries = trips
      .map((trip) => buildJourneyEntry(trip, now));
    const recentTrips = journeyEntries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const upcomingTrips = journeyEntries.filter((trip) => trip.status === 'upcoming').length;
    const activeTrips = journeyEntries.filter((trip) => trip.status === 'active').length;
    const completedTrips = trips.length - upcomingTrips - activeTrips;
    const longestTripDays = trips.reduce((max, trip) => Math.max(max, getTripDurationDays(trip)), 0);

    const stats: TravelStats = {
      totalTrips: trips.length,
      uniqueDestinations,
      totalDays: computeTotalDays(trips),
      tripsWithItinerary,
      upcomingTrips,
      completedTrips,
      activeTrips,
      longestTripDays,
    };

    const badges: Badge[] = BADGE_CONFIGS.map(
      ({ id, name, description, unearnedCls, earnedCls, getProgress }) => {
        const { current, target } = getProgress(trips);
        const boundedCurrent = Math.min(current, target);

        return {
          id,
          name,
          description,
          earned: current >= target,
          unearnedCls,
          earnedCls,
          progressCurrent: boundedCurrent,
          progressTarget: target,
          progressLabel: `${boundedCurrent}/${target}`,
        };
      },
    );

    const nextBadge =
      badges
        .filter((badge) => !badge.earned)
        .sort((a, b) => (b.progressCurrent / b.progressTarget) - (a.progressCurrent / a.progressTarget))[0]
      ?? null;

    return { stats, badges, title: computeTravelTitle(trips.length), nextBadge, recentTrips };
  }, [now, trips]);
}

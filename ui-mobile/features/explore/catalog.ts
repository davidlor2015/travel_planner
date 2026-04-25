// Ported from ui/src/features/explore/adapters/destinationExploreAdapter.ts.
// This catalog is the single source of truth for explore destinations on both web and mobile.
// It is only accessible when EXPO_PUBLIC_ENABLE_EXPLORE=true; it is not ungated mock data.

import type { Destination, DestinationMood } from "./types";

const CATALOG: Destination[] = [
  {
    id: 1,
    name: "Bali",
    country: "Indonesia",
    region: "Asia",
    summary: "Temples, rice terraces & surf",
    bestFor: "$80/day",
    season: "Apr – Oct",
    dailyBudget: "$80/day",
    rating: 4.8,
    moods: ["Trending", "Beach & Islands", "Culture & History"],
    destination: "Bali, Indonesia",
    imageUrl:
      "https://images.unsplash.com/photo-1576475706812-822620fc23ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYWxpJTIwcmljZSUyMHRlcnJhY2VzJTIwdHJvcGljYWx8ZW58MXx8fHwxNzc2NjI1MjM0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    isEditorsPick: true,
    isFeatured: true,
  },
  {
    id: 2,
    name: "Swiss Alps",
    country: "Switzerland",
    region: "Europe",
    summary: "Alpine villages & winter wonderlands",
    bestFor: "$200/day",
    season: "Dec – Mar / Jun – Sep",
    dailyBudget: "$200/day",
    rating: 4.9,
    moods: ["Adventure"],
    destination: "Swiss Alps, Switzerland",
    imageUrl:
      "https://images.unsplash.com/photo-1734268486202-7e85b12a7fa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTd2lzcyUyMEFscHMlMjB2aWxsYWdlJTIwd2ludGVyfGVufDF8fHx8MTc3NjYzODk2NHww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 3,
    name: "Lisbon",
    country: "Portugal",
    region: "Europe",
    summary: "Pastel streets & pasteis de nata",
    bestFor: "$90/day",
    season: "Mar – Oct",
    dailyBudget: "$90/day",
    rating: 4.7,
    moods: ["Trending", "Culture & History", "Culinary"],
    destination: "Lisbon, Portugal",
    imageUrl:
      "https://images.unsplash.com/photo-1738970361018-848be032aa09?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMaXNib24lMjBQb3J0dWdhbCUyMGNvbG9yZnVsJTIwc3RyZWV0c3xlbnwxfHx8fDE3NzY2Mzg5NjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isEditorsPick: true,
  },
  {
    id: 4,
    name: "Maldives",
    country: "Maldives",
    region: "Indian Ocean",
    summary: "Overwater villas & coral reefs",
    bestFor: "$350/day",
    season: "Nov – Apr",
    dailyBudget: "$350/day",
    rating: 4.9,
    moods: ["Beach & Islands"],
    destination: "Maldives",
    imageUrl:
      "https://images.unsplash.com/photo-1637576308588-6647bf80944d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNYWxkaXZlcyUyMG92ZXJ3YXRlciUyMGJ1bmdhbG93fGVufDF8fHx8MTc3NjYzODk2NXww&ixlib=rb-4.1.0&q=80&w=1080",
    isFeatured: true,
  },
  {
    id: 5,
    name: "Iceland",
    country: "Iceland",
    region: "Nordic",
    summary: "Northern lights & volcanic landscapes",
    bestFor: "$180/day",
    season: "Sep – Mar",
    dailyBudget: "$180/day",
    rating: 4.8,
    moods: ["Adventure", "Trending"],
    destination: "Iceland",
    imageUrl:
      "https://images.unsplash.com/photo-1681834418277-b01c30279693?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJY2VsYW5kJTIwbm9ydGhlcm4lMjBsaWdodHMlMjBhdXJvcmF8ZW58MXx8fHwxNzc2NjM4OTY1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    isEditorsPick: true,
  },
  {
    id: 6,
    name: "Queenstown",
    country: "New Zealand",
    region: "Pacific",
    summary: "Lakes, mountains & adrenaline",
    bestFor: "$150/day",
    season: "Nov – Apr",
    dailyBudget: "$150/day",
    rating: 4.7,
    moods: ["Adventure"],
    destination: "Queenstown, New Zealand",
    imageUrl:
      "https://images.unsplash.com/photo-1646369987506-383d96fce566?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOZXclMjBaZWFsYW5kJTIwbW91bnRhaW5zJTIwbGFrZXxlbnwxfHx8fDE3NzY2Mzg5NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 7,
    name: "Machu Picchu",
    country: "Peru",
    region: "South America",
    summary: "Inca ruins above the clouds",
    bestFor: "$60/day",
    season: "May – Sep",
    dailyBudget: "$60/day",
    rating: 4.9,
    moods: ["Culture & History", "Adventure"],
    destination: "Machu Picchu, Peru",
    imageUrl:
      "https://images.unsplash.com/photo-1586367443498-8d0aa9de31bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQZXJ1JTIwTWFjaHUlMjBQaWNjaHUlMjBydWluc3xlbnwxfHx8fDE3NzY2Mzg5NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 8,
    name: "Dubrovnik",
    country: "Croatia",
    region: "Europe",
    summary: "Adriatic gem & walled old town",
    bestFor: "$110/day",
    season: "May – Sep",
    dailyBudget: "$110/day",
    rating: 4.6,
    moods: ["Culture & History", "Beach & Islands"],
    destination: "Dubrovnik, Croatia",
    imageUrl:
      "https://images.unsplash.com/photo-1655560585033-67e928edd1f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxDcm9hdGlhJTIwRHVicm92bmlrJTIwb2xkJTIwdG93bnxlbnwxfHx8fDE3NzY2Mzg5NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 9,
    name: "Serengeti",
    country: "Tanzania",
    region: "Africa",
    summary: "Safari sunsets & the great migration",
    bestFor: "$250/day",
    season: "Jun – Oct",
    dailyBudget: "$250/day",
    rating: 4.9,
    moods: ["Adventure", "Trending"],
    destination: "Serengeti, Tanzania",
    imageUrl:
      "https://images.unsplash.com/photo-1595652973888-c5677816f6f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWZhcmklMjBzdW5zZXQlMjBBZnJpY2ElMjBzYXZhbm5hfGVufDF8fHx8MTc3NjYzODk2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    isEditorsPick: true,
  },
  {
    id: 10,
    name: "Provence",
    country: "France",
    region: "Europe",
    summary: "Lavender fields & village markets",
    bestFor: "$130/day",
    season: "Jun – Aug",
    dailyBudget: "$130/day",
    rating: 4.7,
    moods: ["Culinary", "Culture & History"],
    destination: "Provence, France",
    imageUrl:
      "https://images.unsplash.com/photo-1662486717731-293f2b6ebfa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcm92ZW5jZSUyMGxhdmVuZGVyJTIwZmllbGRzJTIwRnJhbmNlfGVufDF8fHx8MTc3NjYzODk2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 11,
    name: "Halong Bay",
    country: "Vietnam",
    region: "Southeast Asia",
    summary: "Emerald waters & limestone karsts",
    bestFor: "$40/day",
    season: "Oct – Apr",
    dailyBudget: "$40/day",
    rating: 4.6,
    moods: ["Beach & Islands", "Culture & History"],
    destination: "Halong Bay, Vietnam",
    imageUrl:
      "https://images.unsplash.com/photo-1713551584340-7b7817f39a62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWaWV0bmFtJTIwSGFsb25nJTIwQmF5JTIwYm9hdHN8ZW58MXx8fHwxNzc2NjM4OTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 12,
    name: "Scottish Highlands",
    country: "Scotland",
    region: "Europe",
    summary: "Castles, lochs & misty glens",
    bestFor: "$120/day",
    season: "May – Sep",
    dailyBudget: "$120/day",
    rating: 4.5,
    moods: ["Adventure", "Culture & History"],
    destination: "Scottish Highlands, Scotland",
    imageUrl:
      "https://images.unsplash.com/photo-1694086561623-1463e2cf2102?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTY290dGlzaCUyMEhpZ2hsYW5kcyUyMGNhc3RsZSUyMGxhbmRzY2FwZXxlbnwxfHx8fDE3NzY2Mzg5ODB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
];

function normalizeForSearch(d: Destination): string {
  return [d.name, d.country, d.region, d.summary, d.bestFor, d.season, ...d.moods]
    .join(" ")
    .toLowerCase();
}

export function listDestinationMoods(): DestinationMood[] {
  return [
    "Trending",
    "Beach & Islands",
    "Adventure",
    "Culture & History",
    "Culinary",
    "Slow Travel",
  ];
}

export function getDestinations(filters: {
  query?: string;
  mood?: DestinationMood | null;
} = {}): Destination[] {
  const { query = "", mood = null } = filters;
  const q = query.trim().toLowerCase();

  return CATALOG.filter((d) => {
    const matchesQuery = q ? normalizeForSearch(d).includes(q) : true;
    const matchesMood = mood ? d.moods.includes(mood) : true;
    return matchesQuery && matchesMood;
  });
}

export function getFeaturedDestinations(): Destination[] {
  return CATALOG.filter((d) => d.isFeatured);
}

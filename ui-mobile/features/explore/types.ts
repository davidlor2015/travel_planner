// Path: ui-mobile/features/explore/types.ts
// Summary: Implements types module logic.

export type DestinationMood =
  | "Trending"
  | "Beach & Islands"
  | "Adventure"
  | "Culture & History"
  | "Culinary"
  | "Slow Travel";

export interface Destination {
  id: number;
  name: string;
  country: string;
  region: string;
  summary: string;
  bestFor: string;
  season: string;
  dailyBudget?: string;
  rating?: number;
  moods: DestinationMood[];
  destination: string;
  imageUrl: string;
  isEditorsPick?: boolean;
  isFeatured?: boolean;
}

export interface FeaturedCardViewModel {
  id: number;
  name: string;
  locationLine: string;
  season: string;
  imageUrl: string;
}

export interface GridCardViewModel {
  id: number;
  name: string;
  locationLine: string;
  imageUrl: string;
}

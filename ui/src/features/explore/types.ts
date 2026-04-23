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

export interface DestinationFilters {
  query?: string;
  mood?: DestinationMood | null;
}

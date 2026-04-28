// Path: ui-mobile/features/explore/types.ts
// Summary: Implements types module logic.

export type DestinationTheme =
  | "Coastal"
  | "Food"
  | "Culture"
  | "Slow City"
  | "Desert"
  | "Mountain"
  | "Light Adventure"
  | "Off-the-beaten-path";

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tagline: string;
  description: string;
  bestSeason: string;
  suggestedLength: string;
  pace: string;
  themes: DestinationTheme[];
  goodFor: string[];
  startingNotes: string;
  destination: string;
  imageUrl: string;
  isEditorsPick?: boolean;
  isFeatured?: boolean;
}

export interface FeaturedCardViewModel {
  id: string;
  name: string;
  locationLine: string;
  bestSeason: string;
  imageUrl: string;
  destination: string;
}

export interface GridCardViewModel {
  id: string;
  name: string;
  locationLine: string;
  imageUrl: string;
  destination: string;
}

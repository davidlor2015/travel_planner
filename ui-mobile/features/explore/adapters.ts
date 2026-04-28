// Path: ui-mobile/features/explore/adapters.ts
// Summary: Implements adapters module logic.

import type { Destination, FeaturedCardViewModel, GridCardViewModel } from "./types";

export function toFeaturedCardViewModel(d: Destination): FeaturedCardViewModel {
  return {
    id: d.id,
    name: d.name,
    locationLine: `${d.country} · ${d.tagline}`,
    bestSeason: d.bestSeason,
    imageUrl: d.imageUrl,
    destination: d.destination,
  };
}

export function toGridCardViewModel(d: Destination): GridCardViewModel {
  return {
    id: d.id,
    name: d.name,
    locationLine: `${d.country} · ${d.tagline}`,
    imageUrl: d.imageUrl,
    destination: d.destination,
  };
}

import type { Destination, FeaturedCardViewModel, GridCardViewModel } from "./types";

export function toFeaturedCardViewModel(d: Destination): FeaturedCardViewModel {
  return {
    id: d.id,
    name: d.name,
    locationLine: `${d.country} · ${d.summary}`,
    season: d.season,
    imageUrl: d.imageUrl,
  };
}

export function toGridCardViewModel(d: Destination): GridCardViewModel {
  return {
    id: d.id,
    name: d.name,
    locationLine: `${d.country} · ${d.summary}`,
    imageUrl: d.imageUrl,
  };
}

// Path: ui-mobile/features/trips/workspace/helpers/tripVisuals.ts
// Summary: Implements tripVisuals module logic.

const UNSPLASH_PARAMS =
  "crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80&auto=format";

const DESTINATION_IMAGES: { match: RegExp; url: string }[] = [
  { match: /rome|amalfi|naples|sicily|florence|venice|italy/i, url: `https://images.unsplash.com/photo-1516483638261-f4dbaf036963?${UNSPLASH_PARAMS}` },
  { match: /athens|santorini|mykonos|crete|greece/i, url: `https://images.unsplash.com/photo-1533105079780-92b9be482077?${UNSPLASH_PARAMS}` },
  { match: /barcelona|madrid|mallorca|seville|spain/i, url: `https://images.unsplash.com/photo-1464790719320-516ecd75af6c?${UNSPLASH_PARAMS}` },
  { match: /paris|lyon|nice|france/i, url: `https://images.unsplash.com/photo-1499856871958-5b9627545d1a?${UNSPLASH_PARAMS}` },
  { match: /lisbon|porto|portugal/i, url: `https://images.unsplash.com/photo-1513735492246-483525079686?${UNSPLASH_PARAMS}` },
  { match: /london|edinburgh|uk|england|scotland/i, url: `https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?${UNSPLASH_PARAMS}` },
  { match: /tokyo|kyoto|osaka|japan/i, url: `https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?${UNSPLASH_PARAMS}` },
  { match: /seoul|busan|korea/i, url: `https://images.unsplash.com/photo-1538485399081-7c8974d1d9b6?${UNSPLASH_PARAMS}` },
  { match: /bangkok|chiang mai|phuket|thailand/i, url: `https://images.unsplash.com/photo-1508009603885-50cf7c579365?${UNSPLASH_PARAMS}` },
  { match: /bali|jakarta|indonesia/i, url: `https://images.unsplash.com/photo-1537996194471-e657df975ab4?${UNSPLASH_PARAMS}` },
  { match: /new york|chicago|san francisco|usa|united states/i, url: `https://images.unsplash.com/photo-1496588152823-e2874ed2b38d?${UNSPLASH_PARAMS}` },
  { match: /reykjavik|iceland/i, url: `https://images.unsplash.com/photo-1504893524553-b855bce32c67?${UNSPLASH_PARAMS}` },
  { match: /marrakech|casablanca|morocco/i, url: `https://images.unsplash.com/photo-1548013146-72479768bada?${UNSPLASH_PARAMS}` },
  { match: /cape town|south africa/i, url: `https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?${UNSPLASH_PARAMS}` },
  { match: /queenstown|auckland|new zealand/i, url: `https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?${UNSPLASH_PARAMS}` },
];

const FALLBACK_IMAGES = [
  `https://images.unsplash.com/photo-1501785888041-af3ef285b470?${UNSPLASH_PARAMS}`,
  `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?${UNSPLASH_PARAMS}`,
  `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?${UNSPLASH_PARAMS}`,
  `https://images.unsplash.com/photo-1467269204594-9661b134dd2b?${UNSPLASH_PARAMS}`,
];

export function getTripImageUrl(trip: { id: number; destination: string }): string {
  const match = DESTINATION_IMAGES.find((entry) => entry.match.test(trip.destination));
  if (match) return match.url;
  return FALLBACK_IMAGES[Math.abs(trip.id) % FALLBACK_IMAGES.length] ?? FALLBACK_IMAGES[0]!;
}

export function getTripTagline(trip: {
  destination: string;
  durationDays: number;
}): string {
  const [city, country] = trip.destination
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const nights = Math.max(1, trip.durationDays - 1);
  if (country) {
    return `${nights} night${nights === 1 ? "" : "s"} between ${city} light and ${country} air.`;
  }
  return `${nights} night${nights === 1 ? "" : "s"} in ${city ?? trip.destination}, with room to wander.`;
}

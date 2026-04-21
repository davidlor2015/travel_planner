import type { LandingContent } from "../landing.types";

const LANDING_CONTENT: LandingContent = {
  heroImage: "/hero_img.webp",
  features: [
    {
      title: "Shared itineraries",
      description:
        "Build the day-by-day plan once, then keep every traveler looking at the same version.",
      accent: "text-amber bg-amber/10",
      icon: "calendar",
    },
    {
      title: "Group chat",
      description:
        "Keep questions, decisions, and notes beside the trip instead of scattered across threads.",
      accent: "text-olive bg-olive/10",
      icon: "chat",
    },
    {
      title: "Packing and readiness",
      description:
        "Track what is packed, what is shared, and what still needs a gentle nudge before departure.",
      accent: "text-depth bg-depth/10",
      icon: "bag",
    },
    {
      title: "Budget tracking",
      description:
        "Log trip costs by category so the group can see where the money is going.",
      accent: "text-amber bg-amber/10",
      icon: "wallet",
    },
    {
      title: "Booking details",
      description:
        "Add flights, stays, restaurants, and reservations where the itinerary can use them.",
      accent: "text-clay bg-clay/10",
      icon: "ticket",
    },
    {
      title: "Trip map",
      description:
        "See the places in your plan together, from the first hotel to the last dinner.",
      accent: "text-olive bg-olive/10",
      icon: "pin",
    },
  ],
  tripDays: [],
  steps: [
    {
      title: "Create",
      body: "Start with destination, dates, and the kind of trip you want.",
    },
    {
      title: "Generate",
      body: "Turn the idea into an itinerary your group can review and adjust.",
    },
    {
      title: "Track",
      body: "Use bookings, packing, and budget tools once the plan becomes real.",
    },
  ],
  sampleDetails: [],
  destinations: [],
  testimonials: [],
};

export function getLandingContent(): LandingContent {
  return LANDING_CONTENT;
}

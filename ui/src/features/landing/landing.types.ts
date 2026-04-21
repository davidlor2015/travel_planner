export type FeatureIcon = "calendar" | "chat" | "bag" | "wallet" | "ticket" | "pin";

export interface LandingFeature {
  title: string;
  description: string;
  accent: string;
  icon: FeatureIcon;
}

export interface LandingTripDay {
  day: string;
  title: string;
  body: string;
}

export interface LandingStep {
  title: string;
  body: string;
}

export interface LandingDetail {
  label: string;
  value: string;
}

export interface LandingDestination {
  name: string;
  country: string;
  tag: string;
  image: string;
}

export interface LandingTestimonial {
  quote: string;
  name: string;
  context: string;
}

export interface LandingContent {
  heroImage: string;
  features: LandingFeature[];
  tripDays: LandingTripDay[];
  steps: LandingStep[];
  sampleDetails: LandingDetail[];
  destinations: LandingDestination[];
  testimonials: LandingTestimonial[];
}

// Path: ui-mobile/features/trips/tripSchema.ts
// Summary: Implements tripSchema module logic.

export const BUDGET_OPTIONS = [
  { value: "budget",   label: "Budget"    },
  { value: "moderate", label: "Moderate"  },
  { value: "luxury",   label: "Luxury"    },
] as const;

export const PACE_OPTIONS = [
  { value: "relaxed",  label: "Relaxed"    },
  { value: "balanced", label: "Balanced"   },
  { value: "fast",     label: "Fast-paced" },
] as const;

export const INTEREST_OPTIONS = [
  "food", "history", "walking", "culture", "city exploration",
  "nightlife", "shopping", "landmarks", "photography", "nature",
  "art", "architecture",
] as const;

export type BudgetValue   = typeof BUDGET_OPTIONS[number]["value"];
export type PaceValue     = typeof PACE_OPTIONS[number]["value"];
export type InterestValue = typeof INTEREST_OPTIONS[number];

export function serializePreferences(data: {
  budget?: string;
  pace?: string;
  interests?: string[];
}): string {
  return [
    data.budget               ? `Budget: ${data.budget}`                       : null,
    data.pace                 ? `Pace: ${data.pace}`                           : null,
    data.interests?.length    ? `Interests: ${data.interests.join(", ")}`      : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

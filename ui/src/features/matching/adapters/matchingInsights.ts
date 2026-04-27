// Path: ui/src/features/matching/adapters/matchingInsights.ts
// Summary: Implements matchingInsights module logic.

import type { MatchResult, TravelProfile } from '../../../shared/api/matching';



export interface MatchInsight {
  title: string;
  body: string;
}

export interface MatchNarrative {
  strengths: MatchInsight[];
  frictions: MatchInsight[];
}

function pct(value: number): number {
  return Math.round(value * 100);
}

export function formatMatchingLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface ProfileCompleteness {
  score: number;
  completed: number;
  total: number;
  checks: { label: string; done: boolean }[];
  prompts: string[];
}

export function buildProfileCompleteness(
  input: Pick<
    TravelProfile,
    'travel_style' | 'budget_range' | 'interests' | 'group_size_min' | 'group_size_max' | 'is_discoverable'
  >,
): ProfileCompleteness {
  const groupOk =
    input.group_size_min >= 1 &&
    input.group_size_max >= 1 &&
    input.group_size_min <= input.group_size_max;
  const interestsOk = input.interests.length >= 2;

  const checks: { label: string; done: boolean }[] = [
    { label: 'Travel style', done: Boolean(input.travel_style) },
    { label: 'Budget band', done: Boolean(input.budget_range) },
    { label: 'Two or more interests', done: interestsOk },
    { label: 'Group size (min ≤ max)', done: groupOk },
  ];

  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;
  const score = total === 0 ? 0 : Math.round((completed / total) * 100);

  const prompts: string[] = [];
  if (!interestsOk) {
    prompts.push('Add at least two interests so matches see how you like to spend trip time.');
  }
  if (!groupOk) {
    prompts.push('Set group size so the maximum is at least the minimum.');
  }
  if (!input.is_discoverable) {
    prompts.push('You are hidden from discovery—turn discoverability on when you want inbound matches.');
  }

  return { score, completed, total, checks, prompts };
}



export function buildMatchNarrative(result: MatchResult): MatchNarrative {
  const strengths: MatchInsight[] = [];
  const frictions: MatchInsight[] = [];

  if (result.breakdown.interests >= 0.7) {
    strengths.push({
      title: 'Shared interests',
      body: `Strong activity overlap at ${pct(result.breakdown.interests)}%, which usually makes planning much easier.`,
    });
  }
  if (result.breakdown.travel_style >= 0.7) {
    strengths.push({
      title: 'Similar pace',
      body: `Your travel styles are closely aligned at ${pct(result.breakdown.travel_style)}%.`,
    });
  }
  if (result.breakdown.budget >= 0.7) {
    strengths.push({
      title: 'Budget fit',
      body: `Spending expectations line up well at ${pct(result.breakdown.budget)}%.`,
    });
  }
  if (result.breakdown.group_size >= 0.7) {
    strengths.push({
      title: 'Group size fit',
      body: `You want a similar trip size, scoring ${pct(result.breakdown.group_size)}%.`,
    });
  }
  if (result.breakdown.date_overlap >= 0.7) {
    strengths.push({
      title: 'Timing overlap',
      body: `Trip timing aligns strongly at ${pct(result.breakdown.date_overlap)}%, so coordinating should be easier.`,
    });
  }
  if (result.breakdown.destination >= 0.7) {
    strengths.push({
      title: 'Destination alignment',
      body: `You are pointed at a very similar destination fit, scoring ${pct(result.breakdown.destination)}%.`,
    });
  }

  if (result.breakdown.date_overlap < 0.45) {
    frictions.push({
      title: 'Schedule mismatch',
      body: `Date overlap is only ${pct(result.breakdown.date_overlap)}%, so timing may need flexibility.`,
    });
  }
  if (result.breakdown.budget < 0.45) {
    frictions.push({
      title: 'Budget mismatch',
      body: `Budget alignment is ${pct(result.breakdown.budget)}%, which could affect accommodation or activity choices.`,
    });
  }
  if (result.breakdown.travel_style < 0.45) {
    frictions.push({
      title: 'Different travel pace',
      body: `Travel style alignment is ${pct(result.breakdown.travel_style)}%, so expectations may need discussion early.`,
    });
  }
  if (result.breakdown.group_size < 0.45) {
    frictions.push({
      title: 'Group size mismatch',
      body: `Preferred group size only scores ${pct(result.breakdown.group_size)}%, which may change the trip dynamic.`,
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      title: 'Balanced fit',
      body: `This match is driven by several moderate signals rather than one standout area.`,
    });
  }

  return {
    strengths: strengths.slice(0, 3),
    frictions: frictions.slice(0, 2),
  };
}

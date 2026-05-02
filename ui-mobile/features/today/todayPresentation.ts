// Path: ui-mobile/features/today/todayPresentation.ts
// Summary: Implements todayPresentation module logic.

/** Masthead line: "Saturday · Apr 26" (design canvas). */
export function todayMastheadKicker(now: Date = new Date()): string {
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const rest = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekday} · ${rest}`;
}

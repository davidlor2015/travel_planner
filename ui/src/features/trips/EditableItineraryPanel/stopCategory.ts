/**
 * Lightweight category label for timeline metadata pills (no emojis).
 * Heuristic only — same spirit as read-only itinerary categorization.
 */
export type StopCategory =
  | "Transport"
  | "Stay"
  | "Dining"
  | "Leisure"
  | "Activity";

export function inferStopCategory(
  title: string,
  location: string | null,
  notes: string | null,
): StopCategory {
  const value =
    `${title} ${location ?? ""} ${notes ?? ""}`.toLowerCase();

  if (
    /\b(flight|airport|train|bus|taxi|transfer|ferry|station|drive|car|arrive|depart)\b/.test(
      value,
    )
  ) {
    return "Transport";
  }
  if (
    /\b(hotel|villa|stay|check in|check-in|resort|riad|inn|lodging|room)\b/.test(
      value,
    )
  ) {
    return "Stay";
  }
  if (
    /\b(lunch|dinner|breakfast|cafe|coffee|restaurant|meal|tasting|bar|wine)\b/.test(
      value,
    )
  ) {
    return "Dining";
  }
  if (
    /\b(beach|wander|walk|garden|spa|sunset|free time|market|stroll)\b/.test(
      value,
    )
  ) {
    return "Leisure";
  }
  return "Activity";
}

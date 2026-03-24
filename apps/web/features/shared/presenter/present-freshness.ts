const DAY_MS = 86_400_000;

export type Freshness = "today" | "recent" | "this-week" | "older";

/** Classify a publish date into freshness tiers for badge coloring. */
export function presentFreshness(iso: string): Freshness {
  const diff = (Date.now() - new Date(iso).getTime()) / DAY_MS;

  if (diff < 1) return "today";
  if (diff < 3) return "recent";
  if (diff < 7) return "this-week";
  return "older";
}

const DAY_MS = 86_400_000;

/**
 * Convert an ISO date string to a human-friendly relative label.
 * "Today" | "Yesterday" | "3 days ago" | "Mar 15"
 */
export function presentRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  // Compare calendar dates in local timezone
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / DAY_MS);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

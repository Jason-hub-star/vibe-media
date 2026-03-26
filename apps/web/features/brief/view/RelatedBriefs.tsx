import type { BriefListItem } from "@vibehub/content-contracts";

import { BriefCard } from "./BriefCard";

const MAX_RELATED = 4;

interface RelatedBriefsProps {
  currentSlug: string;
  topic?: string;
  briefs: BriefListItem[];
}

/**
 * Displays up to MAX_RELATED related briefs (same topic, excluding current).
 * Hides entirely if no matches found.
 */
export function RelatedBriefs({ currentSlug, topic, briefs }: RelatedBriefsProps) {
  const related = briefs
    .filter((b) => b.slug !== currentSlug && b.topic === topic)
    .slice(0, MAX_RELATED);

  if (related.length === 0) return null;

  return (
    <div className="brief-grid">
      {related.map((brief) => (
        <BriefCard brief={brief} key={brief.slug} />
      ))}
    </div>
  );
}

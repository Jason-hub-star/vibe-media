import { getDiscoverItemDetail } from "@/features/discover/use-case/get-discover-item-detail";

import { listBriefs } from "./list-briefs";

const MAX_RELATED = 4;

/**
 * Returns up to MAX_RELATED related briefs for a discover item,
 * matched by relatedBriefSlugs. Falls back to empty array if no matches.
 */
export async function getRelatedBriefs(discoverItemId: string) {
  const [item, briefs] = await Promise.all([
    getDiscoverItemDetail(discoverItemId),
    listBriefs()
  ]);

  if (!item || item.relatedBriefSlugs.length === 0) return [];

  const slugSet = new Set(item.relatedBriefSlugs);
  return briefs.filter((b) => slugSet.has(b.slug)).slice(0, MAX_RELATED);
}

import type { BriefListItem, DiscoverItem, DiscoverItemDetail } from "@vibehub/content-contracts";

import { listBriefs } from "../brief/list-briefs";
import { listDiscoverItems } from "./list-discover-items";

const MAX_RELATED_BRIEFS = 3;

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function findRelatedBriefSlugs(item: DiscoverItem, briefs: BriefListItem[]): string[] {
  if (item.tags.length === 0) return [];

  const itemTagSet = new Set(item.tags.map(normalizeTag));
  const categoryToken = normalizeTag(item.category);

  const scored: Array<{ slug: string; score: number }> = [];

  for (const brief of briefs) {
    const titleTokens = brief.title.toLowerCase().split(/\s+/).map(normalizeTag);
    let score = 0;

    // tag ↔ brief title token 교차
    for (const token of titleTokens) {
      if (itemTagSet.has(token)) score += 2;
    }

    // category ↔ brief title token 교차
    if (titleTokens.some((t) => t === categoryToken)) score += 1;

    if (score > 0) scored.push({ slug: brief.slug, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELATED_BRIEFS)
    .map((s) => s.slug);
}

export async function getDiscoverItemDetail(
  id: string,
): Promise<DiscoverItemDetail | null> {
  const [items, briefs] = await Promise.all([listDiscoverItems(), listBriefs()]);
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  return {
    ...item,
    fullDescription: item.summary,
    relatedBriefSlugs: findRelatedBriefSlugs(item, briefs),
  };
}

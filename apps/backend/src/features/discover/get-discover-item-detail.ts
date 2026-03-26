import type { DiscoverItemDetail } from "@vibehub/content-contracts";

import { listDiscoverItems } from "./list-discover-items";

export async function getDiscoverItemDetail(
  id: string,
): Promise<DiscoverItemDetail | null> {
  const items = await listDiscoverItems();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  return {
    ...item,
    fullDescription: item.summary,
    relatedBriefSlugs: [],
  };
}

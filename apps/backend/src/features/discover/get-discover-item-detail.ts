import type { DiscoverItem } from "@vibehub/content-contracts";

import { listDiscoverItems } from "./list-discover-items";

export async function getDiscoverItemDetail(
  id: string,
): Promise<DiscoverItem | null> {
  const items = await listDiscoverItems();
  return items.find((item) => item.id === id) ?? null;
}

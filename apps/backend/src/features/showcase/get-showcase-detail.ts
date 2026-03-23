import type { ShowcaseEntry } from "@vibehub/content-contracts";

import { listShowcaseEntries } from "./list-showcase-entries";

export async function getShowcaseDetail(id: string): Promise<ShowcaseEntry | null> {
  const items = await listShowcaseEntries();
  return items.find((i) => i.id === id) ?? null;
}

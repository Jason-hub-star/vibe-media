import type { SourceDetail } from "@vibehub/content-contracts";

import { listSources } from "./list-sources";

export async function getSourceDetail(id: string): Promise<SourceDetail | null> {
  const items = await listSources();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  return {
    ...item,
    runHistory: [],
    reliability: 0,
  };
}

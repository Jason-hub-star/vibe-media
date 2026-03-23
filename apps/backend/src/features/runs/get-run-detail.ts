import type { IngestRun } from "@vibehub/content-contracts";

import { listRuns } from "./list-runs";

export async function getRunDetail(
  id: string,
): Promise<IngestRun | null> {
  const items = await listRuns();
  return items.find((item) => item.id === id) ?? null;
}

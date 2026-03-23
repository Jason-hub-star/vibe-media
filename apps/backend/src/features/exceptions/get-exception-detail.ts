import type { ExceptionQueueItem } from "@vibehub/content-contracts";

import { listExceptionQueue } from "./list-exception-queue";

export async function getExceptionDetail(
  id: string,
): Promise<ExceptionQueueItem | null> {
  const items = await listExceptionQueue();
  return items.find((item) => item.id === id) ?? null;
}

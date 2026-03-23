import type { PublishQueueItem } from "@vibehub/content-contracts";

import { listPublishQueue } from "./list-publish-queue";

export async function getPublishItemDetail(
  id: string,
): Promise<PublishQueueItem | null> {
  const items = await listPublishQueue();
  return items.find((item) => item.id === id) ?? null;
}
